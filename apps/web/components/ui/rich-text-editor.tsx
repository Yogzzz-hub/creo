"use client"

import { useEffect, useMemo } from "react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
import Underline from "@tiptap/extension-underline"
import TextAlign from "@tiptap/extension-text-align"
import Link from "@tiptap/extension-link"
import DOMPurify from "dompurify"
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  Link as LinkIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"

const ALLOWED_TAGS = [
  "p", "br", "strong", "em", "u", "s", "code", "pre",
  "ul", "ol", "li", "a", "h1", "h2", "h3",
  "blockquote", "hr",
]

const ALLOWED_ATTR = ["href", "target", "rel", "class"]

function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
  })
}

function getPlainText(html: string): string {
  const div = document.createElement("div")
  div.innerHTML = html
  return div.textContent || div.innerText || ""
}

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Type your message...",
  disabled = false,
  className,
}: RichTextEditorProps) {
  const extensions = useMemo(
    () => [
      StarterKit.configure({
        heading: false,
      }),
      Placeholder.configure({
        placeholder,
      }),
      Underline,
      TextAlign.configure({
        types: ["paragraph"],
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          target: "_blank",
          rel: "noopener noreferrer",
        },
      }),
    ],
    [placeholder]
  )

  const editor = useEditor({
    extensions,
    content: value,
    editorProps: {
      attributes: {
        class: cn(
          "min-h-[80px] w-full rounded-md bg-transparent px-3 py-2 text-sm outline-none",
          "prose prose-sm max-w-none",
          "placeholder:text-muted-foreground",
          disabled && "cursor-not-allowed opacity-50",
        ),
      },
    },
    onUpdate: ({ editor: e }) => {
      const raw = e.getHTML()
      const clean = sanitizeHtml(raw)
      onChange(clean)
    },
    immediatelyRender: false,
  })

  useEffect(() => {
    if (editor && value !== sanitizeHtml(editor.getHTML()) && value === "") {
      editor.commands.setContent("")
    }
  }, [value, editor])

  if (!editor) return null

  function setLink() {
    if (!editor) return
    const previousUrl = editor.getAttributes("link").href
    const url = window.prompt("URL", previousUrl)
    if (url === null) return
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run()
  }

  return (
    <div className={cn("rounded-md border border-gray-200", disabled && "opacity-50")}>
      <div className="flex flex-wrap items-center gap-0.5 border-b border-gray-200 px-2 py-1">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={disabled}
          className={cn(
            "rounded p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700",
            editor.isActive("bold") && "bg-gray-100 text-gray-700"
          )}
        >
          <Bold className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={disabled}
          className={cn(
            "rounded p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700",
            editor.isActive("italic") && "bg-gray-100 text-gray-700"
          )}
        >
          <Italic className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          disabled={disabled}
          className={cn(
            "rounded p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700",
            editor.isActive("underline") && "bg-gray-100 text-gray-700"
          )}
        >
          <UnderlineIcon className="size-3.5" />
        </button>
        <div className="mx-1 h-4 w-px bg-gray-200" />
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          disabled={disabled}
          className={cn(
            "rounded p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700",
            editor.isActive("bulletList") && "bg-gray-100 text-gray-700"
          )}
        >
          <List className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          disabled={disabled}
          className={cn(
            "rounded p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700",
            editor.isActive("orderedList") && "bg-gray-100 text-gray-700"
          )}
        >
          <ListOrdered className="size-3.5" />
        </button>
        <div className="mx-1 h-4 w-px bg-gray-200" />
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          disabled={disabled}
          className={cn(
            "rounded p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700",
            editor.isActive({ textAlign: "left" }) && "bg-gray-100 text-gray-700"
          )}
        >
          <AlignLeft className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          disabled={disabled}
          className={cn(
            "rounded p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700",
            editor.isActive({ textAlign: "center" }) && "bg-gray-100 text-gray-700"
          )}
        >
          <AlignCenter className="size-3.5" />
        </button>
        <div className="mx-1 h-4 w-px bg-gray-200" />
        <button
          type="button"
          onClick={setLink}
          disabled={disabled}
          className={cn(
            "rounded p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700",
            editor.isActive("link") && "bg-gray-100 text-gray-700"
          )}
        >
          <LinkIcon className="size-3.5" />
        </button>
      </div>
      <EditorContent editor={editor} className="max-h-[200px] overflow-y-auto" />
    </div>
  )
}

export { sanitizeHtml, getPlainText }
