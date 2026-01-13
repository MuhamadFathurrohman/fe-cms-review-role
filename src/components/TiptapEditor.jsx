/**
 * @file TiptapEditor.jsx
 * @description Komponen editor rich text berbasis Tiptap dengan dukungan lengkap.
 * Menyediakan antarmuka pengeditan WYSIWYG dengan fitur:
 * - Format teks dasar (bold, italic, underline)
 * - Heading levels (H1, H2, H3)
 * - Daftar terurut dan tidak terurut
 * - Alignment teks (left, center, right, justify)
 * - Clear formatting
 * - Placeholder dinamis
 * 
 * Mendukung dua mode tampilan:
 * - **Desktop**: Toolbar horizontal lengkap
 * - **Mobile**: Dropdown toolbar yang hemat ruang
 * 
 * Menggunakan Tiptap sebagai engine editor dengan ekstensi:
 * - StarterKit (paragraph, heading, bold, italic, list, dll.)
 * - Underline
 * - TextAlign
 */

import React, { useState, useEffect, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  RemoveFormatting,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  ChevronDown,
  Type,
  Heading,
} from "lucide-react";
import "../sass/components/TiptapEditor/TiptapEditor.css";

/**
 * Props untuk komponen TiptapEditor.
 * @typedef {Object} TiptapEditorProps
 * @property {string} [value=""] - Konten HTML awal editor
 * @property {function(string): void} onChange - Callback saat konten berubah
 * @property {string} [placeholder="Start writing..."] - Placeholder saat editor kosong
 * @property {string} [className=""] - Kelas CSS tambahan
 */

/**
 * Komponen editor rich text berbasis Tiptap.
 * Menyediakan antarmuka WYSIWYG yang responsif untuk pengeditan konten.
 *
 * @component
 * @param {TiptapEditorProps} props - Props komponen
 */
const TiptapEditor = ({ value, onChange, placeholder, className = "" }) => {
  /**
   * Status apakah editor kosong.
   * @type {[boolean, React.Dispatch<React.SetStateAction<boolean>>]}
   */
  const [isEmpty, setIsEmpty] = useState(true);

  /**
   * Status deteksi perangkat mobile.
   * @type {[boolean, React.Dispatch<React.SetStateAction<boolean>>]}
   */
  const [isMobile, setIsMobile] = useState(false);

  /**
   * Status dropdown yang sedang terbuka.
   * @type {[string|null, React.Dispatch<React.SetStateAction<string|null>>]}
   */
  const [openDropdown, setOpenDropdown] = useState(null);

  /** @type {React.MutableRefObject<Object>} Ref untuk elemen dropdown */
  const dropdownRefs = useRef({});

  /**
   * Instance editor Tiptap.
   * @type {import("@tiptap/core").Editor}
   */
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
      TextAlign.configure({
        types: ["heading", "paragraph"],
        alignments: ["left", "center", "right", "justify"],
        defaultAlignment: "left",
      }),
    ],
    content: value || "",
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html);

      const text = editor.getText().trim();
      setIsEmpty(text.length === 0);
    },
  });

  // Detect mobile screen
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 480);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const clickedOutside = Object.values(dropdownRefs.current).every(
        (ref) => ref && !ref.contains(event.target)
      );

      if (clickedOutside) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Sync external value changes
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || "");
      const text = editor.getText().trim();
      setIsEmpty(text.length === 0);
    }
  }, [value, editor]);

  // Initialize empty state
  useEffect(() => {
    if (editor) {
      const text = editor.getText().trim();
      setIsEmpty(text.length === 0);
    }
  }, [editor]);

  if (!editor) {
    return null;
  }

  /**
   * Komponen tombol toolbar dasar.
   * @component
   * @param {Object} props - Props komponen
   * @param {function(): void} props.onClick - Handler klik tombol
   * @param {boolean} props.isActive - Status aktif tombol
   * @param {React.ComponentType} props.icon - Ikon Lucide untuk tombol
   * @param {string} props.title - Tooltip title
   */
  const ToolbarButton = ({ onClick, isActive, icon: Icon, title }) => (
    <button
      type="button"
      onClick={onClick}
      className={`toolbar-btn ${isActive ? "active" : ""}`}
      title={title}
      aria-label={title}
    >
      <Icon size={16} />
    </button>
  );

  /**
   * Komponen dropdown toolbar kustom.
   * Digunakan untuk mode mobile untuk menghemat ruang.
   * 
   * @component
   * @param {Object} props - Props komponen
   * @param {string} props.label - Label dropdown
   * @param {React.ComponentType} props.icon - Ikon default dropdown
   * @param {Array<{icon: React.ComponentType, onClick: function, isActive: boolean}>} props.items - Item dropdown
   * @param {string} props.dropdownKey - Kunci unik untuk dropdown
   */
  const CustomDropdown = ({ label, icon: DefaultIcon, items, dropdownKey }) => {
    const isOpen = openDropdown === dropdownKey;

    // Check if any item in dropdown is active
    const hasActiveItem = items.some((item) => item.isActive);

    // Get active item's icon, or use default icon
    const activeItem = items.find((item) => item.isActive);
    const DisplayIcon = activeItem ? activeItem.icon : DefaultIcon;

    const handleToggle = () => {
      const newState = isOpen ? null : dropdownKey;
      setOpenDropdown(newState);
    };

    return (
      <div
        className="custom-dropdown"
        ref={(el) => (dropdownRefs.current[dropdownKey] = el)}
      >
        <button
          type="button"
          className={`dropdown-trigger ${hasActiveItem ? "has-active" : ""}`}
          onClick={handleToggle}
          aria-haspopup="true"
          aria-expanded={isOpen}
          aria-label={`${label} options`}
        >
          <DisplayIcon size={16} />
          <span className="dropdown-label">{label}</span>
          <ChevronDown size={14} className={isOpen ? "rotate" : ""} />
        </button>

        {isOpen && (
          <div
            className="dropdown-menu"
            style={{
              position: "absolute",
              zIndex: 9999,
              display: "block",
              visibility: "visible",
              opacity: 1,
            }}
            role="menu"
          >
            {items.map((item, index) => (
              <button
                key={index}
                type="button"
                className={`dropdown-item ${item.isActive ? "active" : ""}`}
                onClick={() => {
                  item.onClick();
                  setOpenDropdown(null);
                }}
                role="menuitem"
                aria-label={item.label}
              >
                <item.icon size={16} />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  /** @type {Array<{icon: React.ComponentType, onClick: function, isActive: boolean}>} Item untuk dropdown heading */
  const headingItems = [
    {
      icon: Heading1,
      onClick: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
      isActive: editor.isActive("heading", { level: 1 }),
      label: "Heading 1",
    },
    {
      icon: Heading2,
      onClick: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      isActive: editor.isActive("heading", { level: 2 }),
      label: "Heading 2",
    },
    {
      icon: Heading3,
      onClick: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      isActive: editor.isActive("heading", { level: 3 }),
      label: "Heading 3",
    },
  ];

  /** @type {Array<{icon: React.ComponentType, onClick: function, isActive: boolean}>} Item untuk dropdown format */
  const formatItems = [
    {
      icon: Bold,
      onClick: () => editor.chain().focus().toggleBold().run(),
      isActive: editor.isActive("bold"),
      label: "Bold",
    },
    {
      icon: Italic,
      onClick: () => editor.chain().focus().toggleItalic().run(),
      isActive: editor.isActive("italic"),
      label: "Italic",
    },
    {
      icon: UnderlineIcon,
      onClick: () => editor.chain().focus().toggleUnderline().run(),
      isActive: editor.isActive("underline"),
      label: "Underline",
    },
  ];

  /** @type {Array<{icon: React.ComponentType, onClick: function, isActive: boolean}>} Item untuk dropdown list */
  const listItems = [
    {
      icon: ListOrdered,
      onClick: () => editor.chain().focus().toggleOrderedList().run(),
      isActive: editor.isActive("orderedList"),
      label: "Numbered List",
    },
    {
      icon: List,
      onClick: () => editor.chain().focus().toggleBulletList().run(),
      isActive: editor.isActive("bulletList"),
      label: "Bullet List",
    },
  ];

  /** @type {Array<{icon: React.ComponentType, onClick: function, isActive: boolean}>} Item untuk dropdown alignment */
  const alignItems = [
    {
      icon: AlignLeft,
      onClick: () => editor.chain().focus().setTextAlign("left").run(),
      isActive: editor.isActive({ textAlign: "left" }),
      label: "Align Left",
    },
    {
      icon: AlignCenter,
      onClick: () => editor.chain().focus().setTextAlign("center").run(),
      isActive: editor.isActive({ textAlign: "center" }),
      label: "Align Center",
    },
    {
      icon: AlignRight,
      onClick: () => editor.chain().focus().setTextAlign("right").run(),
      isActive: editor.isActive({ textAlign: "right" }),
      label: "Align Right",
    },
    {
      icon: AlignJustify,
      onClick: () => editor.chain().focus().setTextAlign("justify").run(),
      isActive: editor.isActive({ textAlign: "justify" }),
      label: "Justify",
    },
  ];

  return (
    <div className={`tiptap-editor ${className}`}>
      {isMobile ? (
        // Mobile Toolbar with Dropdowns
        <div className="tiptap-toolbar mobile">
          <CustomDropdown
            label="H"
            icon={Heading}
            items={headingItems}
            dropdownKey="heading"
          />
          <CustomDropdown
            label="Format"
            icon={Type}
            items={formatItems}
            dropdownKey="format"
          />
          <CustomDropdown
            label="List"
            icon={List}
            items={listItems}
            dropdownKey="list"
          />
          <CustomDropdown
            label="Align"
            icon={AlignLeft}
            items={alignItems}
            dropdownKey="align"
          />
          <ToolbarButton
            onClick={() =>
              editor.chain().focus().clearNodes().unsetAllMarks().run()
            }
            isActive={false}
            icon={RemoveFormatting}
            title="Clear Format"
          />
        </div>
      ) : (
        // Desktop Toolbar (Original)
        <div className="tiptap-toolbar">
          <div className="toolbar-group">
            <ToolbarButton
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 1 }).run()
              }
              isActive={editor.isActive("heading", { level: 1 })}
              icon={Heading1}
              title="Heading 1"
            />
            <ToolbarButton
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 2 }).run()
              }
              isActive={editor.isActive("heading", { level: 2 })}
              icon={Heading2}
              title="Heading 2"
            />
            <ToolbarButton
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 3 }).run()
              }
              isActive={editor.isActive("heading", { level: 3 })}
              icon={Heading3}
              title="Heading 3"
            />
          </div>

          <div className="toolbar-divider" />

          <div className="toolbar-group">
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBold().run()}
              isActive={editor.isActive("bold")}
              icon={Bold}
              title="Bold"
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleItalic().run()}
              isActive={editor.isActive("italic")}
              icon={Italic}
              title="Italic"
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              isActive={editor.isActive("underline")}
              icon={UnderlineIcon}
              title="Underline"
            />
          </div>

          <div className="toolbar-divider" />

          <div className="toolbar-group">
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              isActive={editor.isActive("orderedList")}
              icon={ListOrdered}
              title="Numbered List"
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              isActive={editor.isActive("bulletList")}
              icon={List}
              title="Bullet List"
            />
          </div>

          <div className="toolbar-divider" />

          <div className="toolbar-group">
            <ToolbarButton
              onClick={() => editor.chain().focus().setTextAlign("left").run()}
              isActive={editor.isActive({ textAlign: "left" })}
              icon={AlignLeft}
              title="Align Left"
            />
            <ToolbarButton
              onClick={() =>
                editor.chain().focus().setTextAlign("center").run()
              }
              isActive={editor.isActive({ textAlign: "center" })}
              icon={AlignCenter}
              title="Align Center"
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().setTextAlign("right").run()}
              isActive={editor.isActive({ textAlign: "right" })}
              icon={AlignRight}
              title="Align Right"
            />
            <ToolbarButton
              onClick={() =>
                editor.chain().focus().setTextAlign("justify").run()
              }
              isActive={editor.isActive({ textAlign: "justify" })}
              icon={AlignJustify}
              title="Justify"
            />
          </div>

          <div className="toolbar-divider" />

          <div className="toolbar-group">
            <ToolbarButton
              onClick={() =>
                editor.chain().focus().clearNodes().unsetAllMarks().run()
              }
              isActive={false}
              icon={RemoveFormatting}
              title="Clear Format"
            />
          </div>
        </div>
      )}

      <div className="tiptap-editor-wrapper">
        {isEmpty && (
          <div
            className="tiptap-placeholder"
            onClick={() => editor.commands.focus()}
            aria-hidden="true"
          >
            {placeholder || "Start writing..."}
          </div>
        )}
        <div className="tiptap-editor-content">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
};

export default TiptapEditor;