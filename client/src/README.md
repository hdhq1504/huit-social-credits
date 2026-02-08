# Client Source Code Structure

This document provides an overview of the client-side folder structure.

## Directory Structure

```
src/
├── admin/              # Admin panel module
│   ├── components/     # Admin-specific reusable components
│   ├── contexts/       # Admin context providers
│   ├── layouts/        # Admin layout components
│   └── pages/          # Admin page components (each with components/ subfolder)
│
├── api/                # API service modules with query keys
│   ├── *.api.js        # API functions and query key exports
│   └── axios.api.js    # Axios instance configuration
│
├── components/         # Shared/global reusable components
│
├── config/             # Application configuration
│   ├── routes.config.js    # Route path constants and builders
│   └── *.config.js         # Other configurations
│
├── constants/          # Global constants and enums
│   ├── roles.js        # User role constants with labels/colors
│   ├── status.js       # Status constants for activities/approvals
│   └── messages.js     # Toast message templates and helpers
│
├── contexts/           # Global context providers
│
├── hooks/              # Custom React hooks
│   ├── useTable.jsx    # Table state management hook
│   ├── useModal.jsx    # Modal state management hook
│   └── useConfirmDialog.jsx  # Confirmation dialog hook
│
├── teacher/            # Teacher module
│   ├── components/
│   ├── contexts/
│   ├── layouts/
│   └── pages/
│
├── user/               # Student/user module
│   ├── components/
│   ├── layouts/
│   └── pages/
│
└── utils/              # Utility functions
    └── datetime.js     # Date formatting utilities
```

## Page Component Structure

Large page components are split into sub-components:

```
pages/ExamplePage/
├── ExamplePage.jsx           # Main component
├── ExamplePage.module.scss   # Styles
├── exampleUtils.jsx          # Helper functions (if needed)
└── components/               # Sub-components folder
    ├── index.js              # Re-exports
    ├── ExampleFilters.jsx    # Filter bar
    ├── ExampleModals.jsx     # Modal components
    └── ...
```

## Naming Conventions

| Type        | Convention                      | Example                       |
| ----------- | ------------------------------- | ----------------------------- |
| Folders     | PascalCase or camelCase         | `pages/`, `components/`       |
| Components  | PascalCase                      | `AdminTable.jsx`              |
| Utils/Hooks | camelCase                       | `useTable.jsx`, `datetime.js` |
| Styles      | Component name + `.module.scss` | `FeedbackPage.module.scss`    |
| API files   | feature + `.api.js`             | `activities.api.js`           |
| Constants   | camelCase                       | `roles.js`, `status.js`       |

## Key Patterns

### API Services

Each API file exports functions and a query key:

```javascript
// activities.api.js
export const ACTIVITIES_QUERY_KEY = ['activities'];
export default { list, get, create, update, remove };
```

### Custom Hooks

Shared state logic is extracted into hooks:

- `useTable` - pagination, filters, sorting, selection
- `useModal` - open/close state with optional data
- `useConfirmDialog` - confirmation modal with async confirm

### Constants

Centralized in `constants/` folder:

- `roles.js` - ADMIN, TEACHER, STUDENT with Vietnamese labels
- `status.js` - Activity, approval, registration status enums
- `messages.js` - Toast message templates with helper functions
