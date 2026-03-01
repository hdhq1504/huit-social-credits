import React, { useCallback, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames/bind';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Underline } from '@tiptap/extension-underline';
import { Link } from '@tiptap/extension-link';
import { Image } from '@tiptap/extension-image';
import { TextAlign } from '@tiptap/extension-text-align';
import { Placeholder } from '@tiptap/extension-placeholder';
import { Highlight } from '@tiptap/extension-highlight';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Typography } from '@tiptap/extension-typography';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBold,
  faItalic,
  faUnderline,
  faStrikethrough,
  faListOl,
  faListUl,
  faAlignLeft,
  faAlignCenter,
  faAlignRight,
  faAlignJustify,
  faLink,
  faImage,
  faQuoteLeft,
  faCode,
  faHighlighter,
  faUndo,
  faRedo,
  faRemoveFormat,
  faMinus,
} from '@fortawesome/free-solid-svg-icons';

import styles from './RichTextEditor.module.scss';

const cx = classNames.bind(styles);

/* ─── Toolbar Button ─── */
const ToolbarButton = ({ icon, label, isActive, onClick, disabled }) => (
  <button
    type="button"
    title={label}
    className={cx('toolbar__btn', {
      'toolbar__btn--active': isActive,
      'toolbar__btn--disabled': disabled,
    })}
    onClick={onClick}
    disabled={disabled}
  >
    <FontAwesomeIcon icon={icon} />
  </button>
);

ToolbarButton.propTypes = {
  icon: PropTypes.object.isRequired,
  label: PropTypes.string.isRequired,
  isActive: PropTypes.bool,
  onClick: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

/* ─── Toolbar Divider ─── */
const ToolbarDivider = () => <span className={cx('toolbar__divider')} />;

/* ─── Heading Dropdown ─── */
const HeadingDropdown = ({ editor }) => {
  const current = [1, 2, 3].find((level) => editor.isActive('heading', { level }));

  const handleChange = (e) => {
    const val = e.target.value;
    if (val === 'paragraph') {
      editor.chain().focus().setParagraph().run();
    } else {
      editor
        .chain()
        .focus()
        .toggleHeading({ level: Number(val) })
        .run();
    }
  };

  return (
    <select className={cx('toolbar__heading-select')} value={current || 'paragraph'} onChange={handleChange}>
      <option value="paragraph">Normal</option>
      <option value="1">Heading 1</option>
      <option value="2">Heading 2</option>
      <option value="3">Heading 3</option>
    </select>
  );
};

HeadingDropdown.propTypes = { editor: PropTypes.object.isRequired };

/* ─── Editor Toolbar ─── */
const EditorToolbar = ({ editor }) => {
  const setLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('Nhập URL:', previousUrl || 'https://');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  const addImage = useCallback(() => {
    if (!editor) return;
    const url = window.prompt('Nhập URL hình ảnh:', 'https://');
    if (!url) return;
    editor.chain().focus().setImage({ src: url }).run();
  }, [editor]);

  if (!editor) return null;

  return (
    <div className={cx('toolbar')}>
      {/* Heading */}
      <div className={cx('toolbar__group')}>
        <HeadingDropdown editor={editor} />
      </div>

      <ToolbarDivider />

      {/* Text Formatting */}
      <div className={cx('toolbar__group')}>
        <ToolbarButton
          icon={faBold}
          label="In đậm (Ctrl+B)"
          isActive={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
        />
        <ToolbarButton
          icon={faItalic}
          label="In nghiêng (Ctrl+I)"
          isActive={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        />
        <ToolbarButton
          icon={faUnderline}
          label="Gạch chân (Ctrl+U)"
          isActive={editor.isActive('underline')}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        />
        <ToolbarButton
          icon={faStrikethrough}
          label="Gạch ngang"
          isActive={editor.isActive('strike')}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        />
        <ToolbarButton
          icon={faHighlighter}
          label="Đánh dấu"
          isActive={editor.isActive('highlight')}
          onClick={() => editor.chain().focus().toggleHighlight().run()}
        />
      </div>

      <ToolbarDivider />

      {/* Lists */}
      <div className={cx('toolbar__group')}>
        <ToolbarButton
          icon={faListUl}
          label="Danh sách"
          isActive={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        />
        <ToolbarButton
          icon={faListOl}
          label="Danh sách có số"
          isActive={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        />
      </div>

      <ToolbarDivider />

      {/* Alignment */}
      <div className={cx('toolbar__group')}>
        <ToolbarButton
          icon={faAlignLeft}
          label="Căn trái"
          isActive={editor.isActive({ textAlign: 'left' })}
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
        />
        <ToolbarButton
          icon={faAlignCenter}
          label="Căn giữa"
          isActive={editor.isActive({ textAlign: 'center' })}
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
        />
        <ToolbarButton
          icon={faAlignRight}
          label="Căn phải"
          isActive={editor.isActive({ textAlign: 'right' })}
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
        />
        <ToolbarButton
          icon={faAlignJustify}
          label="Căn đều"
          isActive={editor.isActive({ textAlign: 'justify' })}
          onClick={() => editor.chain().focus().setTextAlign('justify').run()}
        />
      </div>

      <ToolbarDivider />

      {/* Block elements */}
      <div className={cx('toolbar__group')}>
        <ToolbarButton
          icon={faQuoteLeft}
          label="Trích dẫn"
          isActive={editor.isActive('blockquote')}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        />
        <ToolbarButton
          icon={faCode}
          label="Code block"
          isActive={editor.isActive('codeBlock')}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        />
        <ToolbarButton
          icon={faMinus}
          label="Đường kẻ ngang"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        />
      </div>

      <ToolbarDivider />

      {/* Insert */}
      <div className={cx('toolbar__group')}>
        <ToolbarButton icon={faLink} label="Chèn liên kết" isActive={editor.isActive('link')} onClick={setLink} />
        <ToolbarButton icon={faImage} label="Chèn hình ảnh" onClick={addImage} />
      </div>

      <ToolbarDivider />

      {/* History & Clear */}
      <div className={cx('toolbar__group')}>
        <ToolbarButton
          icon={faUndo}
          label="Hoàn tác (Ctrl+Z)"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
        />
        <ToolbarButton
          icon={faRedo}
          label="Làm lại (Ctrl+Y)"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
        />
        <ToolbarButton
          icon={faRemoveFormat}
          label="Xóa định dạng"
          onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
        />
      </div>
    </div>
  );
};

EditorToolbar.propTypes = { editor: PropTypes.object };

/* ─── Main Component ─── */
function RichTextEditor({ value, onChange, placeholder, className, readOnly }) {
  const isInternalChange = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'editor-link' },
      }),
      Image.configure({
        inline: true,
        HTMLAttributes: { class: 'editor-image' },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Placeholder.configure({
        placeholder: placeholder || 'Nhập nội dung...',
      }),
      Highlight.configure({ multicolor: false }),
      TextStyle,
      Color,
      Typography,
    ],
    content: value || '',
    editable: !readOnly,
    onUpdate: ({ editor: ed }) => {
      isInternalChange.current = true;
      const html = ed.getHTML();
      // Return empty string if editor is empty (<p></p>)
      const isEmpty = html === '<p></p>' || html === '';
      onChange?.(isEmpty ? '' : html);
    },
  });

  // Sync external value changes
  useEffect(() => {
    if (!editor) return;
    if (isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }

    const currentHTML = editor.getHTML();
    const normalizedCurrent = currentHTML === '<p></p>' ? '' : currentHTML;
    const normalizedValue = value || '';

    if (normalizedCurrent !== normalizedValue) {
      editor.commands.setContent(normalizedValue, false);
    }
  }, [value, editor]);

  // Sync readOnly
  useEffect(() => {
    if (editor) {
      editor.setEditable(!readOnly);
    }
  }, [readOnly, editor]);

  return (
    <div
      className={cx('editor', className, {
        'editor--readonly': readOnly,
        'editor--focused': editor?.isFocused,
      })}
    >
      {!readOnly && <EditorToolbar editor={editor} />}
      <EditorContent editor={editor} className={cx('editor__content')} />
    </div>
  );
}

RichTextEditor.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func,
  placeholder: PropTypes.string,
  className: PropTypes.string,
  readOnly: PropTypes.bool,
};

RichTextEditor.defaultProps = {
  value: '',
  onChange: () => {},
  placeholder: '',
  className: '',
  readOnly: false,
};

export default RichTextEditor;
