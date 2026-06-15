import React, { useRef } from 'react';
import {
  MDXEditor,
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  thematicBreakPlugin,
  markdownShortcutPlugin,
  MDXEditorMethods,
  toolbarPlugin,
  UndoRedo, BoldItalicUnderlineToggles,
  BlockTypeSelect, CreateLink,
  InsertImage, InsertTable,
  tablePlugin, imagePlugin, linkPlugin, linkDialogPlugin,
  diffSourcePlugin, DiffSourceToggleWrapper
} from '@mdxeditor/editor';
import '@mdxeditor/editor/style.css';

interface WikiEditorProps {
  markdown: string;
  onChange: (md: string) => void;
  onSave?: () => void;
}

export const WikiEditor: React.FC<WikiEditorProps> = ({ markdown, onChange, onSave }) => {
  const ref = useRef<MDXEditorMethods>(null);

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
        onChange={onChange}
        plugins={[
          headingsPlugin(),
          listsPlugin(),
          quotePlugin(),
          thematicBreakPlugin(),
          markdownShortcutPlugin(),
          tablePlugin(),
          imagePlugin({ imageUploadHandler: async (file: File) => {
              // Em um sistema real poderíamos fazer upload pro backend. 
              // Por enquanto, criamos uma URL temporária pra imagem não quebrar imediatamente.
              return URL.createObjectURL(file);
          } }),
          linkPlugin(),
          linkDialogPlugin(),
          diffSourcePlugin({ diffMarkdown: markdown, viewMode: 'rich-text' }),
          toolbarPlugin({
            toolbarContents: () => (
              <div style={{ display: 'flex', width: '100%', alignItems: 'center', gap: '0.5rem' }}>
                <UndoRedo />
                <BoldItalicUnderlineToggles />
                <BlockTypeSelect />
                <CreateLink />
                <InsertImage />
                <InsertTable />
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
