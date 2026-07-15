---
name: markitdown
description: Converts various files (PDF, Word, Excel, audio, images) to Markdown using Microsoft's MarkItDown. Use this when the user asks to read a complex document or extract text from a non-plaintext file.
---

# MarkItDown Skill

You can use the `markitdown` CLI tool to convert various file types to Markdown. 
This is incredibly useful when you need to read the contents of PDFs, Word documents (docx), Excel spreadsheets (xlsx), PowerPoints (pptx), Audio files (wav, mp3), HTML, or Images (exif/ocr).

## Usage

To convert a file and read its contents, use your `run_command` tool:

```bash
markitdown <path_to_file>
```

This will print the markdown output directly to standard output, allowing you to read it.

If the file is very large and you want to save it instead, you can redirect the output:

```bash
markitdown <path_to_file> > <path_to_output.md>
```

If the CLI isn't in PATH, you can run it via Python:

```bash
python -m markitdown <path_to_file>
```
