import React, { useRef } from 'react';
import {
  MDXEditor,
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  thematicBreakPlugin,
  markdownShortcutPlugin,
  toolbarPlugin,
  UndoRedo, BoldItalicUnderlineToggles,
  BlockTypeSelect, CreateLink,
  InsertImage, InsertTable, ListsToggle, CodeToggle, InsertThematicBreak,
  tablePlugin, imagePlugin, linkPlugin, linkDialogPlugin,
  diffSourcePlugin, DiffSourceToggleWrapper,
  codeBlockPlugin,
  directivesPlugin,
  AdmonitionDirectiveDescriptor
} from '@mdxeditor/editor';
import type { MDXEditorMethods } from '@mdxeditor/editor';
import '@mdxeditor/editor/style.css';
import { getWikiConfig } from '../../store';
import { convertImageToWebP } from '../../utils/imageUtils';
import { DataviewRenderer } from './DataviewRenderer';
import { MermaidRenderer } from './MermaidRenderer';

interface WikiEditorProps {
  markdown: string;
  onChange: (md: string) => void;
  onSave?: () => void;
  editorRef?: React.RefObject<MDXEditorMethods>;
  activeFile?: string;
}

export const WikiEditor: React.FC<WikiEditorProps> = ({ markdown, onChange, onSave, editorRef, activeFile }) => {
  const internalRef = useRef<MDXEditorMethods>(null);
  const ref = editorRef || internalRef;

  return (
    <div className="wiki-mdx-container" 
         onKeyDown={(e) => {
           if (e.ctrlKey && e.key === 's') {
             e.preventDefault();
             onSave?.();
           }
         }}>
      <MDXEditor
        ref={ref}
        markdown={markdown}
        className="dark-theme dark-editor dozero-mdx"
        onChange={onChange}
        plugins={[
          headingsPlugin(),
          listsPlugin(),
          quotePlugin(),
          thematicBreakPlugin(),
          markdownShortcutPlugin(),
          tablePlugin(),
          imagePlugin({ 
            imageUploadHandler: async (file: File) => {
              // Converter a imagem para WebP para enviar pela nossa API
              const { base64, filename } = await convertImageToWebP(file);
              
              let finalFilename = filename;
              if (activeFile) {
                const baseName = activeFile.split('/').pop()?.replace('.md', '') || '';
                if (baseName) {
                  const extIndex = filename.lastIndexOf('.');
                  const ext = extIndex !== -1 ? filename.substring(extIndex) : '';
                  const nameWithoutExt = extIndex !== -1 ? filename.substring(0, extIndex) : filename;
                  const shortOriginal = nameWithoutExt.substring(0, 4);
                  finalFilename = `${baseName}_${shortOriginal}${ext}`;
                }
              }

              // Enviar para o servidor local
              const config = getWikiConfig();
              const repoPath = config.repoUrl || 'D:/DOZERO/wikidozero';
              
              const res = await fetch('/api/wiki/save-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  repoPath,
                  filename: finalFilename,
                  base64
                })
              });
              
              if (!res.ok) throw new Error("Erro ao salvar imagem");
              const data = await res.json();
              
              // Retornar a URL que o editor vai inserir no markdown (ex: ANEXOS/foto.png)
              return data.url;
            },
            imagePreviewHandler: async (url: string) => {
              // Quando o editor for renderizar a imagem, dizemos para buscar da nossa API crua
              const config = getWikiConfig();
              const repoPath = config.repoUrl || 'D:/DOZERO/wikidozero';
              // Se já for uma URL externa (http), deixa passar direto
              if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
                return url;
              }
              // Caso contrário, busca na API raw do nosso servidor
              return `/api/wiki/raw?path=${encodeURIComponent(url)}&repoPath=${encodeURIComponent(repoPath)}`;
            }
          }),
          linkPlugin(),
          linkDialogPlugin(),
          directivesPlugin({ directiveDescriptors: [AdmonitionDirectiveDescriptor] }),
          codeBlockPlugin({
            codeBlockEditorDescriptors: [
              {
                match: (language) => language === 'dataview' || language === 'dataviewjs',
                priority: 10,
                Editor: (props: any) => {
                  if (props.language === 'dataview') {
                    return (
                      <div className="not-prose my-4">
                        <DataviewRenderer query={props.code} isJS={false} activeFile={activeFile} />
                      </div>
                    );
                  }
                  if (props.language === 'dataviewjs') {
                    return (
                      <div className="not-prose my-4">
                        <DataviewRenderer query={props.code} isJS={true} activeFile={activeFile} />
                      </div>
                    );
                  }
                  return null;
                }
              },
              {
                match: (language) => language === 'mermaid',
                priority: 10,
                Editor: (props: any) => (
                  <div style={{ margin: '1rem 0' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '0.5rem' }}>Gráfico Vetorial</div>
                    <MermaidRenderer code={props.code} />
                  </div>
                )
              }
            ]
          }),
          diffSourcePlugin({ diffMarkdown: markdown, viewMode: 'rich-text' }),
          toolbarPlugin({
            toolbarContents: () => (
              <div style={{ display: 'flex', width: '100%', alignItems: 'center', gap: '0.5rem' }}>
                <UndoRedo />
                <div style={{ width: '1px', height: '24px', background: 'var(--glass-border)', margin: '0 4px' }} />
                <BoldItalicUnderlineToggles />
                <CodeToggle />
                <div style={{ width: '1px', height: '24px', background: 'var(--glass-border)', margin: '0 4px' }} />
                <ListsToggle />
                <div style={{ width: '1px', height: '24px', background: 'var(--glass-border)', margin: '0 4px' }} />
                <BlockTypeSelect />
                <div style={{ width: '1px', height: '24px', background: 'var(--glass-border)', margin: '0 4px' }} />
                <CreateLink />
                <InsertImage />
                <InsertTable />
                <InsertThematicBreak />
                <div style={{ flex: 1 }}></div>
                <DiffSourceToggleWrapper>
                  <span style={{ fontSize: '0.8rem', padding: '0 8px' }}>Código-Fonte</span>
                </DiffSourceToggleWrapper>
              </div>
            )
          })
        ]}
      />
    </div>
  );
};
