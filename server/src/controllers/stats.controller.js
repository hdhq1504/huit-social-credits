import prisma from "../prisma.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import {
  CERTIFICATE_TARGETS,
  CERTIFICATE_TOTAL_TARGET,
  DEFAULT_POINT_GROUP,
  POINT_GROUPS,
  getPointGroupLabel,
  normalizePointGroup,
} from "../utils/points.js";
import { mapAttendanceMethodToApi } from "../utils/attendance.js";

const PROGRESS_GROUP_KEYS = Object.keys(POINT_GROUPS);
const GROUP_ONE_KEY = "NHOM_1";
const GROUP_TWO_KEY = "NHOM_2";
const GROUP_THREE_KEY = "NHOM_3";
const COMBINED_GROUP_KEY = "NHOM_23";
const ACTIVE_REG_STATUSES = ["DANG_KY", "DA_THAM_GIA"];
const RED_ADDRESS_KEYWORD = "dia chi do";

// Chuẩn hóa văn bản (xóa dấu, chuyển thường)
const normalizeText = (value) => {
  if (!value) return "";
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ");
};

// Kiểm tra hoạt động có chứa từ khóa "Địa chỉ đỏ"
const containsRedAddressKeyword = (activity) => {
  if (!activity) return false;
  const sources = [activity.tieuDe, activity.moTa];
  return sources.some((source) => {
    const normalized = normalizeText(source);
    return normalized.includes(RED_ADDRESS_KEYWORD);
  });
};

// Chuẩn hóa mã định danh
const sanitizeIdentifier = (value) => {
  if (!value) return null;
  const trimmed = String(value).trim();
  return trimmed || null;
};

// Xây dựng bộ lọc báo cáo từ query string
const buildReportFilters = (query = {}) => {
  const yearId = sanitizeIdentifier(
    query.yearId ?? query.namHocId ?? query.year,
  );
  const semesterId = sanitizeIdentifier(
    query.semesterId ?? query.hocKyId ?? query.semester,
  );
  return { yearId, semesterId };
};

// Định dạng nhãn năm học
const formatYearLabel = (year) => {
  if (!year) return "Năm học";
  const candidates = [year.ten, year.nienKhoa, year.ma];
  const label = candidates.find((candidate) => {
    if (!candidate) return false;
    const trimmed = String(candidate).trim();
    return Boolean(trimmed);
  });
  return label ? String(label).trim() : "Năm học";
};

// Định dạng nhãn học kỳ
const formatSemesterLabel = (semester) => {
  if (!semester) return "Học kỳ";
  const candidates = [semester.ten, semester.ma];
  const label = candidates.find((candidate) => {
    if (!candidate) return false;
    const trimmed = String(candidate).trim();
    return Boolean(trimmed);
  });
  return label ? String(label).trim() : "Học kỳ";
};

// An toàn trim chuỗi (trả về null nếu rỗng)
const safeTrim = (value) => {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  return trimmed || null;
};

/**
 * Lấy tóm tắt tiến độ tích lũy điểm của sinh viên.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
export const getProgressSummary = asyncHandler(async (req, res) => {
  const userId = req.user?.sub;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const [user, registrations] = await Promise.all([
    prisma.nguoiDung.findUnique({
      where: { id: userId },
      select: { avatarUrl: true },
    }),
    prisma.dangKyHoatDong.findMany({
      where: {
        nguoiDungId: userId,
        trangThai: "DA_THAM_GIA",
      },
      include: {
        hoatDong: {
          select: {
            diemCong: true,
            nhomDiem: true,
            tieuDe: true,
            moTa: true,
          },
        },
      },
    }),
  ]);

  const pointTotals = PROGRESS_GROUP_KEYS.reduce((acc, key) => {
    acc[key] = 0;
    return acc;
  }, {});

  let hasRedAddressParticipation = false;

  registrations.forEach((registration) => {
    const activity = registration.hoatDong;
    if (!activity) return;

    const group = normalizePointGroup(activity.nhomDiem ?? DEFAULT_POINT_GROUP);
    const points = activity.diemCong ?? 0;
    pointTotals[group] += points;

    if (!hasRedAddressParticipation && group === GROUP_ONE_KEY) {
      hasRedAddressParticipation = containsRedAddressKeyword(activity);
    }
  });

  const groupOneTarget = CERTIFICATE_TARGETS.GROUP_ONE;
  const groupTwoThreeTarget = CERTIFICATE_TARGETS.GROUP_TWO_THREE;

  const groupOneRawPoints = pointTotals[GROUP_ONE_KEY] ?? 0;
  const groupTwoRawPoints = pointTotals[GROUP_TWO_KEY] ?? 0;
  const groupThreeRawPoints = pointTotals[GROUP_THREE_KEY] ?? 0;

  const overflowFromGroupOne = Math.max(groupOneRawPoints - groupOneTarget, 0);
  const groupOneEffectivePoints = Math.min(groupOneRawPoints, groupOneTarget);
  const groupTwoThreeEffectivePoints =
    groupTwoRawPoints + groupThreeRawPoints + overflowFromGroupOne;
  const normalizedGroupTwoThreePoints = Math.min(
    groupTwoThreeEffectivePoints,
    groupTwoThreeTarget,
  );

  const normalizedGroupOnePoints = groupOneEffectivePoints;
  const totalPoints = normalizedGroupOnePoints + normalizedGroupTwoThreePoints;
  const totalTarget = CERTIFICATE_TOTAL_TARGET;

  const groupOneRemaining = Math.max(
    groupOneTarget - groupOneEffectivePoints,
    0,
  );
  const groupTwoThreeRemaining = Math.max(
    groupTwoThreeTarget - normalizedGroupTwoThreePoints,
    0,
  );

  const groupOneHasRequiredPoints = groupOneEffectivePoints >= groupOneTarget;
  const groupTwoThreeHasRequiredPoints =
    groupTwoThreeEffectivePoints >= groupTwoThreeTarget;
  const isQualified =
    groupOneHasRequiredPoints &&
    groupTwoThreeHasRequiredPoints &&
    hasRedAddressParticipation;

  const groupOneStatus =
    groupOneHasRequiredPoints && hasRedAddressParticipation
      ? "success"
      : "warning";
  const groupTwoThreeStatus = groupTwoThreeHasRequiredPoints
    ? "success"
    : "warning";

  const groupOneNote = (() => {
    if (!groupOneHasRequiredPoints) {
      return groupOneRemaining > 0
        ? `Còn ${groupOneRemaining} điểm`
        : "Cần hoàn thành điểm nhóm 1";
    }
    if (!hasRedAddressParticipation) {
      return "Tham gia ít nhất 1 hoạt động Địa chỉ đỏ";
    }
    return "Hoàn thành";
  })();

  const groupTwoThreeNote =
    groupTwoThreeRemaining > 0
      ? `Còn ${groupTwoThreeRemaining} điểm`
      : "Hoàn thành";

  const groups = [
    {
      id: GROUP_ONE_KEY,
      name: "Nhóm 1",
      target: groupOneTarget,
      current: groupOneEffectivePoints,
      remaining: groupOneRemaining,
      status: groupOneStatus,
      note: groupOneNote,
      value: `${groupOneEffectivePoints}/${groupOneTarget}`,
      details: {
        rawPoints: groupOneRawPoints,
        effectivePoints: groupOneEffectivePoints,
        overflowTransferred: overflowFromGroupOne,
        hasRedAddressParticipation,
      },
    },
    {
      id: COMBINED_GROUP_KEY,
      name: "Nhóm 2,3",
      target: groupTwoThreeTarget,
      current: groupTwoThreeEffectivePoints,
      remaining: groupTwoThreeRemaining,
      status: groupTwoThreeStatus,
      note: groupTwoThreeNote,
      value: `${groupTwoThreeEffectivePoints}/${groupTwoThreeTarget}`,
      details: {
        rawGroupTwoPoints: groupTwoRawPoints,
        rawGroupThreePoints: groupThreeRawPoints,
        overflowFromGroupOne,
      },
    },
  ];

  const missingPoints = groupOneRemaining + groupTwoThreeRemaining;
  const percent =
    totalTarget > 0
      ? Math.min(100, Math.round((totalPoints / totalTarget) * 100))
      : 0;

  const requirements = {
    isQualified,
    totalTarget,
    totalEarnedPoints: totalPoints,
    totalRawPoints: groupOneRawPoints + groupTwoRawPoints + groupThreeRawPoints,
    groupOne: {
      target: groupOneTarget,
      earned: groupOneRawPoints,
      effective: groupOneEffectivePoints,
      hasRequiredPoints: groupOneHasRequiredPoints,
      hasRedAddressParticipation,
      overflowToGroup23: overflowFromGroupOne,
    },
    groupTwoThree: {
      target: groupTwoThreeTarget,
      earned: groupTwoThreeEffectivePoints,
      rawGroupTwoPoints: groupTwoRawPoints,
      rawGroupThreePoints: groupThreeRawPoints,
      hasRequiredPoints: groupTwoThreeHasRequiredPoints,
      overflowFromGroupOne,
    },
  };

  res.json({
    progress: {
      currentPoints: totalPoints,
      targetPoints: totalTarget,
      percent,
      missingPoints,
      groups,
      avatarUrl: user?.avatarUrl ?? null,
      isQualified,
      requirements,
    },
  });
});

const computePercentChange = (current, previous) => {
  if (!previous) {
    return current > 0 ? 100 : 0;
  }
  const delta = ((current - previous) / previous) * 100;
  if (!Number.isFinite(delta)) {
    return 0;
  }
  return Math.round(delta);
};

const monthLabel = (month) => `T${month}`;

const buildChartData = (activities = []) => {
  const buckets = new Map();

  activities.forEach((activity) => {
    const start = activity.batDauLuc ? new Date(activity.batDauLuc) : null;
    if (!start || Number.isNaN(start.getTime())) return;

    const year = start.getFullYear();
    const month = start.getMonth() + 1;
    if (!buckets.has(year)) {
      buckets.set(year, new Map());
    }
    const yearBucket = buckets.get(year);
    if (!yearBucket.has(month)) {
      yearBucket.set(month, { group1: 0, group2: 0, group3: 0 });
    }
    const target = yearBucket.get(month);
    if (activity.nhomDiem === GROUP_ONE_KEY) {
      target.group1 += 1;
    } else if (activity.nhomDiem === GROUP_TWO_KEY) {
      target.group2 += 1;
    } else if (activity.nhomDiem === GROUP_THREE_KEY) {
      target.group3 += 1;
    }
  });

  const chart = {};
  Array.from(buckets.entries())
    .sort(([yearA], [yearB]) => Number(yearA) - Number(yearB))
    .forEach(([year, months]) => {
      const rows = [];
      for (let month = 1; month <= 12; month += 1) {
        const entry = months.get(month) ?? { group1: 0, group2: 0, group3: 0 };
        rows.push({
          month,
          label: monthLabel(month),
          group1: entry.group1,
          group2: entry.group2,
          group3: entry.group3,
        });
      }
      chart[year] = rows;
    });

  return chart;
};

const mapUpcomingActivities = (activities = []) =>
  activities.map((activity) => {
    const attendanceMethod = mapAttendanceMethodToApi(
      activity.phuongThucDiemDanh,
    );
    return {
      id: activity.id,
      title: activity.tieuDe,
      location: activity.diaDiem ?? "Đang cập nhật",
      startTime: activity.batDauLuc?.toISOString() ?? null,
      attendanceMethod,
      participantsCount: activity._count?.dangKy ?? 0,
      maxCapacity: activity.sucChuaToiDa ?? null,
    };
  });

const mapFeedbackSummaries = (feedbacks = []) =>
  feedbacks.map((feedback) => ({
    id: feedback.id,
    message: feedback.noiDung,
    submittedAt: feedback.taoLuc?.toISOString() ?? null,
    name:
      feedback.nguoiDung?.hoTen ?? feedback.nguoiDung?.email ?? "Người dùng",
    avatarUrl: feedback.nguoiDung?.avatarUrl ?? null,
  }));

/**
 * Lấy dữ liệu tổng quan cho Dashboard Admin.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
export const getAdminDashboardOverview = asyncHandler(async (req, res) => {
  if (req.user?.role !== "ADMIN") {
    return res.status(403).json({ error: "Forbidden" });
  }

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(
    thirtyDaysAgo.getTime() - 30 * 24 * 60 * 60 * 1000,
  );
  const chartStartDate = new Date(now.getFullYear() - 2, 0, 1);

  const [
    [totalActivities, totalParticipants, pendingFeedback],
    [
      recentActivities,
      previousActivities,
      recentParticipants,
      previousParticipants,
      recentFeedbacks,
      previousFeedbacks,
    ],
    chartSource,
    upcomingActivities,
    pendingFeedbackList,
  ] = await Promise.all([
    Promise.all([
      prisma.hoatDong.count(),
      prisma.dangKyHoatDong.count({
        where: { trangThai: { in: ACTIVE_REG_STATUSES } },
      }),
      prisma.phanHoiHoatDong.count({ where: { trangThai: "CHO_DUYET" } }),
    ]),
    Promise.all([
      prisma.hoatDong.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.hoatDong.count({
        where: { createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } },
      }),
      prisma.dangKyHoatDong.count({
        where: {
          dangKyLuc: { gte: thirtyDaysAgo },
          trangThai: { in: ACTIVE_REG_STATUSES },
        },
      }),
      prisma.dangKyHoatDong.count({
        where: {
          dangKyLuc: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
          trangThai: { in: ACTIVE_REG_STATUSES },
        },
      }),
      prisma.phanHoiHoatDong.count({
        where: { taoLuc: { gte: thirtyDaysAgo } },
      }),
      prisma.phanHoiHoatDong.count({
        where: { taoLuc: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } },
      }),
    ]),
    prisma.hoatDong.findMany({
      where: { batDauLuc: { not: null, gte: chartStartDate } },
      select: { id: true, nhomDiem: true, batDauLuc: true },
    }),
    prisma.hoatDong.findMany({
      where: {
        batDauLuc: { gte: now },
        isPublished: true,
      },
      include: {
        _count: {
          select: {
            dangKy: { where: { trangThai: { in: ACTIVE_REG_STATUSES } } },
          },
        },
      },
      orderBy: { batDauLuc: "asc" },
      take: 4,
    }),
    prisma.phanHoiHoatDong.findMany({
      where: { trangThai: "CHO_DUYET" },
      include: {
        nguoiDung: {
          select: {
            hoTen: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { taoLuc: "desc" },
      take: 5,
    }),
  ]);

  const overview = {
    activities: {
      total: totalActivities,
      changePercent: computePercentChange(recentActivities, previousActivities),
    },
    participants: {
      total: totalParticipants,
      changePercent: computePercentChange(
        recentParticipants,
        previousParticipants,
      ),
    },
    feedbacks: {
      total: pendingFeedback,
      changePercent: computePercentChange(recentFeedbacks, previousFeedbacks),
    },
  };

  const chart = buildChartData(chartSource);
  const upcoming = mapUpcomingActivities(upcomingActivities);
  const feedbacks = mapFeedbackSummaries(pendingFeedbackList);

  res.json({ overview, chart, upcoming, feedbacks });
});

/**
 * Lấy báo cáo thống kê chi tiết cho Admin.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
export const getAdminReportsSummary = asyncHandler(async (req, res) => {
  if (req.user?.role !== "ADMIN") {
    return res.status(403).json({ error: "Forbidden" });
  }

  const filters = buildReportFilters(req.query);
  const activityFilter = { isPublished: true };
  if (filters.semesterId) {
    activityFilter.hocKyId = filters.semesterId;
  }
  if (filters.yearId) {
    activityFilter.namHocId = filters.yearId;
  }

  const [years, semesters, participations] = await Promise.all([
    prisma.namHoc.findMany({
      orderBy: { batDau: "asc" },
    }),
    prisma.hocKy.findMany({
      orderBy: { batDau: "asc" },
      select: {
        id: true,
        ten: true,
        ma: true,
        thuTu: true,
        namHocId: true,
      },
    }),
    prisma.dangKyHoatDong.findMany({
      where: {
        trangThai: "DA_THAM_GIA",
        hoatDong: activityFilter,
      },
      select: {
        id: true,
        dangKyLuc: true,
        nguoiDung: {
          select: {
            id: true,
            hoTen: true,
            email: true,
            maSV: true,
            lopHoc: {
              select: {
                maLop: true,
                nganhHoc: {
                  select: {
                    khoa: {
                      select: {
                        maKhoa: true,
                      },
                    },
                  },
                },
              },
            },
            khoa: {
              select: {
                maKhoa: true,
              },
            },
          },
        },
        hoatDong: {
          select: {
            id: true,
            tieuDe: true,
            diemCong: true,
            nhomDiem: true,
            batDauLuc: true,
            namHocId: true,
            hocKyId: true,
          },
        },
      },
    }),
  ]);

  const participantIds = new Set();
  const activityIds = new Set();
  const classMap = new Map();
  const studentMap = new Map();
  const categoryMap = new Map();
  const facultyMap = new Map();
  const activityMap = new Map();
  const timelineMap = new Map();

  let totalPoints = 0;

  participations.forEach((entry) => {
    const student = entry.nguoiDung;
    const activity = entry.hoatDong;
    if (!student || !activity) return;

    const numericPoints = Number(activity.diemCong) || 0;
    const classCode = safeTrim(student.lopHoc?.maLop) ?? "Chưa cập nhật";
    const facultyCode =
      safeTrim(
        student.khoa?.maKhoa || student.lopHoc?.nganhHoc?.khoa?.maKhoa,
      ) ?? "Chưa cập nhật";
    const studentName =
      safeTrim(student.hoTen) ?? safeTrim(student.email) ?? "Sinh viên";
    const studentId = student.id;

    totalPoints += numericPoints;
    participantIds.add(studentId);
    activityIds.add(activity.id);

    if (!classMap.has(classCode)) {
      classMap.set(classCode, {
        classCode,
        faculty: facultyCode,
        totalPoints: 0,
        participationCount: 0,
        studentIds: new Set(),
      });
    }
    const classEntry = classMap.get(classCode);
    classEntry.totalPoints += numericPoints;
    classEntry.participationCount += 1;
    classEntry.studentIds.add(studentId);

    if (!studentMap.has(studentId)) {
      studentMap.set(studentId, {
        id: studentId,
        studentCode: safeTrim(student.maSV),
        name: studentName,
        email: safeTrim(student.email),
        classCode,
        faculty: facultyCode,
        totalPoints: 0,
        activityCount: 0,
      });
    }
    const studentEntry = studentMap.get(studentId);
    studentEntry.totalPoints += numericPoints;
    studentEntry.activityCount += 1;

    const groupKey = normalizePointGroup(
      activity.nhomDiem ?? DEFAULT_POINT_GROUP,
    );
    if (!categoryMap.has(groupKey)) {
      categoryMap.set(groupKey, {
        id: groupKey,
        label: getPointGroupLabel(groupKey),
        totalPoints: 0,
        activityCount: 0,
      });
    }
    const categoryEntry = categoryMap.get(groupKey);
    categoryEntry.totalPoints += numericPoints;
    categoryEntry.activityCount += 1;

    if (!facultyMap.has(facultyCode)) {
      facultyMap.set(facultyCode, {
        faculty: facultyCode,
        totalPoints: 0,
        participationCount: 0,
        studentIds: new Set(),
      });
    }
    const facultyEntry = facultyMap.get(facultyCode);
    facultyEntry.totalPoints += numericPoints;
    facultyEntry.participationCount += 1;
    facultyEntry.studentIds.add(studentId);

    if (!activityMap.has(activity.id)) {
      activityMap.set(activity.id, {
        id: activity.id,
        title: safeTrim(activity.tieuDe) ?? "Hoạt động",
        pointGroup: groupKey,
        pointGroupLabel: getPointGroupLabel(groupKey),
        basePoints: Number(activity.diemCong) || 0,
        totalPoints: 0,
        participantCount: 0,
        yearId: activity.namHocId ?? null,
        semesterId: activity.hocKyId ?? null,
      });
    }
    const activityEntry = activityMap.get(activity.id);
    activityEntry.totalPoints += numericPoints;
    activityEntry.participantCount += 1;

    const attendanceDate = activity.batDauLuc
      ? new Date(activity.batDauLuc)
      : entry.dangKyLuc
        ? new Date(entry.dangKyLuc)
        : null;
    if (attendanceDate && !Number.isNaN(attendanceDate.getTime())) {
      const year = attendanceDate.getFullYear();
      const month = attendanceDate.getMonth() + 1;
      const key = `${year}-${String(month).padStart(2, "0")}`;
      if (!timelineMap.has(key)) {
        timelineMap.set(key, {
          key,
          year,
          month,
          label: `T${month}/${year}`,
          totalPoints: 0,
          registrations: 0,
        });
      }
      const bucket = timelineMap.get(key);
      bucket.totalPoints += numericPoints;
      bucket.registrations += 1;
    }
  });

  const overview = {
    totalPoints,
    totalParticipants: participantIds.size,
    totalActivities: activityIds.size,
    averagePointsPerStudent:
      participantIds.size > 0
        ? Math.round((totalPoints / participantIds.size) * 100) / 100
        : 0,
  };

  const classRanking = Array.from(classMap.values())
    .map((entry) => ({
      classCode: entry.classCode,
      faculty: entry.faculty,
      totalPoints: entry.totalPoints,
      studentCount: entry.studentIds.size,
      participationCount: entry.participationCount,
      averagePoints:
        entry.studentIds.size > 0
          ? Math.round((entry.totalPoints / entry.studentIds.size) * 100) / 100
          : 0,
    }))
    .sort((a, b) => b.totalPoints - a.totalPoints);

  const studentRanking = Array.from(studentMap.values())
    .map((entry) => ({
      ...entry,
      averagePoints:
        entry.activityCount > 0
          ? Math.round((entry.totalPoints / entry.activityCount) * 100) / 100
          : 0,
    }))
    .sort((a, b) => b.totalPoints - a.totalPoints)
    .slice(0, 50);

  const categorySummary = Array.from(categoryMap.values())
    .map((entry) => ({
      ...entry,
      percent:
        totalPoints > 0
          ? Math.round((entry.totalPoints / totalPoints) * 1000) / 10
          : 0,
    }))
    .sort((a, b) => b.totalPoints - a.totalPoints);

  const facultySummary = Array.from(facultyMap.values())
    .map((entry) => ({
      faculty: entry.faculty,
      totalPoints: entry.totalPoints,
      studentCount: entry.studentIds.size,
      participationCount: entry.participationCount,
      averagePoints:
        entry.studentIds.size > 0
          ? Math.round((entry.totalPoints / entry.studentIds.size) * 100) / 100
          : 0,
    }))
    .sort((a, b) => b.totalPoints - a.totalPoints);

  const topActivities = Array.from(activityMap.values())
    .map((entry) => ({
      ...entry,
      averagePointsPerParticipant:
        entry.participantCount > 0
          ? Math.round((entry.totalPoints / entry.participantCount) * 100) / 100
          : 0,
    }))
    .sort((a, b) => b.totalPoints - a.totalPoints)
    .slice(0, 10);

  const timeline = Array.from(timelineMap.values()).sort((a, b) => {
    if (a.year === b.year) return a.month - b.month;
    return a.year - b.year;
  });

  const yearOptions = years.map((year) => ({
    id: year.id,
    label: formatYearLabel(year),
    code: safeTrim(year.ma),
    startDate: year.batDau?.toISOString?.() ?? null,
    endDate: year.ketThuc?.toISOString?.() ?? null,
    isActive: Boolean(year.isActive),
  }));

  const semesterOptions = semesters.map((semester) => ({
    id: semester.id,
    label: formatSemesterLabel(semester),
    code: safeTrim(semester.ma),
    order: semester.thuTu ?? null,
    yearId: semester.namHocId,
  }));

  res.json({
    overview,
    byClass: classRanking,
    byStudent: studentRanking,
    byCategory: categorySummary,
    byFaculty: facultySummary,
    byActivity: topActivities,
    timeline,
    totals: {
      participants: participantIds.size,
      activities: activityIds.size,
      records: participations.length,
    },
    filters: {
      years: yearOptions,
      semesters: semesterOptions,
      applied: filters,
    },
    generatedAt: new Date().toISOString(),
  });
});
