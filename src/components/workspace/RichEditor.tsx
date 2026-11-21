"use client";

import { useState } from "react";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyleKit } from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import Image from "@tiptap/extension-image";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { TableKit } from "@tiptap/extension-table";
import { CharacterCount, Placeholder } from "@tiptap/extensions";
import type { DocContent } from "@/lib/doc-content";

/**
 * The word processor: a toolbar over a page. Built on Tiptap (ProseMirror).
 * Content is kept as structured data rather than HTML, so a saved document
 * can only ever contain the kinds of things listed in `extensions` below.
 */

const FONTS = [
  { label: "Default", value: "" },
  { label: "Sans serif", value: "Arial, Helvetica, sans-serif" },
  { label: "Serif", value: "Georgia, 'Times New Roman', serif" },
  { label: "Monospace", value: "'IBM Plex Mono', 'Courier New', monospace" },
  { label: "Display", value: "Michroma, sans-serif" },
];
const SIZES = ["11px", "12px", "14px", "16px", "18px", "20px", "24px", "32px", "48px"];
const LINE_HEIGHTS = ["1", "1.15", "1.5", "2"];
const TEXT_COLORS = ["#eef1f8", "#98a1b8", "#7ee0b2", "#86a9f0", "#b08fe6", "#d6a65f", "#e08f94", "#ff6b6b"];
const HIGHLIGHTS = ["#7ee0b255", "#86a9f055", "#b08fe655", "#d6a65f66", "#e08f9466", "#ffe06655"];

const extensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3, 4] },
    // Links open from the toolbar, not on click, so clicking one while editing just places the cursor.
    link: { openOnClick: false, autolink: true, defaultProtocol: "https", protocols: ["http", "https", "mailto"] },
  }),
  TextStyleKit,
  Highlight.configure({ multicolor: true }),
  TextAlign.configure({ types: ["heading", "paragraph"] }),
  Subscript,
  Superscript,
  Image,
  TaskList,
  TaskItem.configure({ nested: true }),
  TableKit.configure({ table: { resizable: true } }),
  Placeholder.configure({ placeholder: "Start writing…" }),
  CharacterCount,
];

export function useRichEditor({ content, editable, onChange }: { content: DocContent; editable: boolean; onChange: () => void }) {
  return useEditor({
    extensions,
    content,
    editable,
    // Rendered in the browser only, to match what the server sent.
    immediatelyRender: false,
    onUpdate: onChange,
    editorProps: { attributes: { class: "doc-content", "aria-label": "Document text", role: "textbox", "aria-multiline": "true" } },
  });
}

export function EditorPage({ editor }: { editor: Editor | null }) {
  return (
    <div className="doc-page">
      {editor ? <EditorContent editor={editor} /> : <p className="muted">Opening…</p>}
    </div>
  );
}

export function WordCount({ editor }: { editor: Editor }) {
  const counts = useEditorState({
    editor,
    selector: ({ editor: e }) => ({ words: e.storage.characterCount.words() as number, characters: e.storage.characterCount.characters() as number }),
  });
  return <span>{counts.words.toLocaleString()} words · {counts.characters.toLocaleString()} characters</span>;
}

// ── Toolbar ──────────────────────────────────────────────────

const ICONS: Record<string, React.ReactNode> = {
  undo: <path d="M6 7H11.5a3.5 3.5 0 010 7H8M6 7l3-3M6 7l3 3" />,
  redo: <path d="M12 7H6.5a3.5 3.5 0 000 7H10M12 7L9 4M12 7l-3 3" />,
  left: <path d="M3 4.5h12M3 7.8h7M3 11.2h12M3 14.5h7" />,
  center: <path d="M3 4.5h12M5.5 7.8h7M3 11.2h12M5.5 14.5h7" />,
  right: <path d="M3 4.5h12M8 7.8h7M3 11.2h12M8 14.5h7" />,
  justify: <path d="M3 4.5h12M3 7.8h12M3 11.2h12M3 14.5h12" />,
  bullets: <path d="M7 5h8M7 9h8M7 13h8M3.5 5h.01M3.5 9h.01M3.5 13h.01" />,
  numbers: <path d="M7.5 5h7.5M7.5 9h7.5M7.5 13h7.5M3 4l1-.5V7M3 11.5c.8-.8 2-.3 1.5.6L3 14h2" />,
  tasks: <path d="M3 4.5l1.2 1.2L6.5 3.5M3 11.5l1.2 1.2L6.5 10.5M9 5h6M9 12h6" />,
  outdent: <path d="M3 4h12M9 7.5h6M9 10.5h6M3 14h12M6 7L3.5 9 6 11" />,
  indent: <path d="M3 4h12M9 7.5h6M9 10.5h6M3 14h12M3.5 7L6 9l-2.5 2" />,
  quote: <path d="M4 5v8M7.5 6.5h7.5M7.5 9.5h7.5M7.5 12.5h5" />,
  code: <path d="M6.5 5.5L3 9l3.5 3.5M11.5 5.5L15 9l-3.5 3.5" />,
  rule: <path d="M2.5 9h13" />,
  link: <path d="M7.5 10.5a3 3 0 004.2 0l2-2a3 3 0 00-4.2-4.2l-.8.8M10.5 7.5a3 3 0 00-4.2 0l-2 2a3 3 0 004.2 4.2l.8-.8" />,
  image: <path d="M3 4h12v10H3zM3 11.5l3.5-3.5 3 3 2-2 3.5 3.5M11.5 7h.01" />,
  table: <path d="M3 4h12v10H3zM3 7.5h12M3 10.8h12M7 4v10M11 4v10" />,
  clear: <path d="M5 4h9M9.5 4L7.5 14M5.5 14h4M11.5 10.5l4 4M15.5 10.5l-4 4" />,
};

function Icon({ name }: { name: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONS[name]}
    </svg>
  );
}

function Btn({
  label,
  onClick,
  active = false,
  disabled = false,
  icon,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  icon?: string;
  children?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className="doc-tool"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      // Keep the text selection: don't let the button take focus on press.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {icon ? <Icon name={icon} /> : children}
    </button>
  );
}

/** A toolbar button that opens a small panel beneath it. */
function Menu({ label, face, children }: { label: string; face: React.ReactNode; children: (close: () => void) => React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="doc-menu" onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setOpen(false)}>
      <button type="button" className="doc-tool" title={label} aria-label={label} aria-expanded={open} onMouseDown={(e) => e.preventDefault()} onClick={() => setOpen((v) => !v)}>
        {face}
      </button>
      {open && <div className="doc-menu-panel">{children(() => setOpen(false))}</div>}
    </div>
  );
}

function UrlForm({ label, initial, onApply, onRemove }: { label: string; initial: string; onApply: (url: string) => void; onRemove?: () => void }) {
  const [url, setUrl] = useState(initial);
  return (
    <form
      className="doc-url"
      onSubmit={(e) => {
        e.preventDefault();
        if (url.trim()) onApply(url.trim());
      }}
    >
      <label htmlFor={`doc-url-${label}`} className="sr-only">{label}</label>
      <input id={`doc-url-${label}`} type="text" inputMode="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" autoFocus />
      <button className="btn btn-primary" style={{ padding: "8px 14px", fontSize: 13 }}>Apply</button>
      {onRemove && <button type="button" className="ws-text-btn" onClick={onRemove}>Remove</button>}
    </form>
  );
}

export function Toolbar({ editor }: { editor: Editor }) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      const style = e.getAttributes("textStyle");
      return {
        canUndo: e.can().undo(),
        canRedo: e.can().redo(),
        block: e.isActive("heading") ? `h${e.getAttributes("heading").level}` : e.isActive("codeBlock") ? "code" : "p",
        font: (style.fontFamily as string) ?? "",
        size: (style.fontSize as string) ?? "",
        lineHeight: (style.lineHeight as string) ?? "",
        bold: e.isActive("bold"),
        italic: e.isActive("italic"),
        underline: e.isActive("underline"),
        strike: e.isActive("strike"),
        sub: e.isActive("subscript"),
        sup: e.isActive("superscript"),
        color: (style.color as string) ?? "",
        highlight: e.isActive("highlight"),
        align: (["center", "right", "justify"].find((a) => e.isActive({ textAlign: a })) ?? "left") as string,
        bullets: e.isActive("bulletList"),
        numbers: e.isActive("orderedList"),
        tasks: e.isActive("taskList"),
        quote: e.isActive("blockquote"),
        link: e.isActive("link"),
        href: (e.getAttributes("link").href as string) ?? "",
        inTable: e.isActive("table"),
        inList: e.isActive("listItem") || e.isActive("taskItem"),
      };
    },
  });
  const run = () => editor.chain().focus();
  const item = s.tasks ? "taskItem" : "listItem";

  const setBlock = (value: string) => {
    if (value === "p") run().setParagraph().run();
    else if (value === "code") run().setCodeBlock().run();
    else run().setHeading({ level: Number(value.slice(1)) as 1 | 2 | 3 | 4 }).run();
  };

  return (
    <div className="doc-toolbar" role="toolbar" aria-label="Formatting">
      <div className="doc-tools">
        <Btn label="Undo (Ctrl+Z)" icon="undo" disabled={!s.canUndo} onClick={() => run().undo().run()} />
        <Btn label="Redo (Ctrl+Shift+Z)" icon="redo" disabled={!s.canRedo} onClick={() => run().redo().run()} />
      </div>

      <div className="doc-tools">
        <label className="sr-only" htmlFor="doc-style">Paragraph style</label>
        <select id="doc-style" className="doc-select" style={{ width: 132 }} value={s.block} onChange={(e) => setBlock(e.target.value)}>
          <option value="p">Normal text</option>
          <option value="h1">Title</option>
          <option value="h2">Heading 1</option>
          <option value="h3">Heading 2</option>
          <option value="h4">Heading 3</option>
          <option value="code">Code block</option>
        </select>
        <label className="sr-only" htmlFor="doc-font">Font</label>
        <select id="doc-font" className="doc-select" style={{ width: 118 }} value={s.font} onChange={(e) => (e.target.value ? run().setFontFamily(e.target.value).run() : run().unsetFontFamily().run())}>
          {FONTS.map((f) => <option key={f.label} value={f.value}>{f.label}</option>)}
        </select>
        <label className="sr-only" htmlFor="doc-size">Font size</label>
        <select id="doc-size" className="doc-select" style={{ width: 76 }} value={s.size} onChange={(e) => (e.target.value ? run().setFontSize(e.target.value).run() : run().unsetFontSize().run())}>
          <option value="">Size</option>
          {SIZES.map((size) => <option key={size} value={size}>{parseInt(size)}</option>)}
        </select>
      </div>

      <div className="doc-tools">
        <Btn label="Bold (Ctrl+B)" active={s.bold} onClick={() => run().toggleBold().run()}><b>B</b></Btn>
        <Btn label="Italic (Ctrl+I)" active={s.italic} onClick={() => run().toggleItalic().run()}><i style={{ fontFamily: "Georgia, serif" }}>I</i></Btn>
        <Btn label="Underline (Ctrl+U)" active={s.underline} onClick={() => run().toggleUnderline().run()}><span style={{ textDecoration: "underline" }}>U</span></Btn>
        <Btn label="Strikethrough" active={s.strike} onClick={() => run().toggleStrike().run()}><span style={{ textDecoration: "line-through" }}>S</span></Btn>
        <Btn label="Subscript" active={s.sub} onClick={() => run().unsetSuperscript().toggleSubscript().run()}><span>x<sub>2</sub></span></Btn>
        <Btn label="Superscript" active={s.sup} onClick={() => run().unsetSubscript().toggleSuperscript().run()}><span>x<sup>2</sup></span></Btn>
        <Menu label="Text color" face={<span className="doc-color-face" style={{ borderBottomColor: s.color || "var(--starlight)" }}>A</span>}>
          {(close) => (
            <div className="doc-swatches">
              {TEXT_COLORS.map((c) => (
                <button key={c} type="button" className="doc-swatch" style={{ background: c }} aria-label={`Text color ${c}`} onMouseDown={(e) => e.preventDefault()} onClick={() => { run().setColor(c).run(); close(); }} />
              ))}
              <button type="button" className="ws-text-btn" onMouseDown={(e) => e.preventDefault()} onClick={() => { run().unsetColor().run(); close(); }}>Default</button>
            </div>
          )}
        </Menu>
        <Menu label="Highlight" face={<span className="doc-highlight-face" data-on={s.highlight}>ab</span>}>
          {(close) => (
            <div className="doc-swatches">
              {HIGHLIGHTS.map((c) => (
                <button key={c} type="button" className="doc-swatch" style={{ background: c }} aria-label={`Highlight ${c}`} onMouseDown={(e) => e.preventDefault()} onClick={() => { run().setHighlight({ color: c }).run(); close(); }} />
              ))}
              <button type="button" className="ws-text-btn" onMouseDown={(e) => e.preventDefault()} onClick={() => { run().unsetHighlight().run(); close(); }}>None</button>
            </div>
          )}
        </Menu>
        <Btn label="Clear formatting" icon="clear" onClick={() => run().unsetAllMarks().clearNodes().run()} />
      </div>

      <div className="doc-tools">
        <Btn label="Align left" icon="left" active={s.align === "left"} onClick={() => run().setTextAlign("left").run()} />
        <Btn label="Align center" icon="center" active={s.align === "center"} onClick={() => run().setTextAlign("center").run()} />
        <Btn label="Align right" icon="right" active={s.align === "right"} onClick={() => run().setTextAlign("right").run()} />
        <Btn label="Justify" icon="justify" active={s.align === "justify"} onClick={() => run().setTextAlign("justify").run()} />
        <label className="sr-only" htmlFor="doc-spacing">Line spacing</label>
        <select id="doc-spacing" className="doc-select" style={{ width: 92 }} value={s.lineHeight} onChange={(e) => (e.target.value ? run().setLineHeight(e.target.value).run() : run().unsetLineHeight().run())}>
          <option value="">Spacing</option>
          {LINE_HEIGHTS.map((h) => <option key={h} value={h}>{h}</option>)}
        </select>
      </div>

      <div className="doc-tools">
        <Btn label="Bulleted list" icon="bullets" active={s.bullets} onClick={() => run().toggleBulletList().run()} />
        <Btn label="Numbered list" icon="numbers" active={s.numbers} onClick={() => run().toggleOrderedList().run()} />
        <Btn label="Checklist" icon="tasks" active={s.tasks} onClick={() => run().toggleTaskList().run()} />
        <Btn label="Decrease indent" icon="outdent" disabled={!s.inList} onClick={() => run().liftListItem(item).run()} />
        <Btn label="Increase indent" icon="indent" disabled={!s.inList} onClick={() => run().sinkListItem(item).run()} />
        <Btn label="Quote" icon="quote" active={s.quote} onClick={() => run().toggleBlockquote().run()} />
      </div>

      <div className="doc-tools">
        <Menu label="Link" face={<span data-on={s.link} className="doc-face"><Icon name="link" /></span>}>
          {(close) => (
            <UrlForm
              label="Link address"
              initial={s.href}
              onApply={(url) => { run().extendMarkRange("link").setLink({ href: /^(https?:|mailto:)/i.test(url) ? url : `https://${url}` }).run(); close(); }}
              onRemove={s.link ? () => { run().extendMarkRange("link").unsetLink().run(); close(); } : undefined}
            />
          )}
        </Menu>
        <Menu label="Image from a web address" face={<Icon name="image" />}>
          {(close) => <UrlForm label="Image address" initial="" onApply={(url) => { if (/^https?:\/\//i.test(url)) run().setImage({ src: url }).run(); close(); }} />}
        </Menu>
        <Btn label="Insert table" icon="table" onClick={() => run().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} />
        <Btn label="Horizontal line" icon="rule" onClick={() => run().setHorizontalRule().run()} />
        <Btn label="Inline code" icon="code" onClick={() => run().toggleCode().run()} />
      </div>

      {s.inTable && (
        <div className="doc-tools doc-tools-table">
          <span className="doc-tools-label">Table</span>
          <Btn label="Add row below" onClick={() => run().addRowAfter().run()}><span className="doc-word">+ Row</span></Btn>
          <Btn label="Add column to the right" onClick={() => run().addColumnAfter().run()}><span className="doc-word">+ Column</span></Btn>
          <Btn label="Delete row" onClick={() => run().deleteRow().run()}><span className="doc-word">− Row</span></Btn>
          <Btn label="Delete column" onClick={() => run().deleteColumn().run()}><span className="doc-word">− Column</span></Btn>
          <Btn label="Toggle header row" onClick={() => run().toggleHeaderRow().run()}><span className="doc-word">Header</span></Btn>
          <Btn label="Merge or split cells" onClick={() => run().mergeOrSplit().run()}><span className="doc-word">Merge</span></Btn>
          <Btn label="Delete table" onClick={() => run().deleteTable().run()}><span className="doc-word">Delete table</span></Btn>
        </div>
      )}
    </div>
  );
}
