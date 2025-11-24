"use client";

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DocumentPanelProps {
  content: string;
  onContentChange: (content: string) => void;
}

export const DocumentPanel: React.FC<DocumentPanelProps> = ({
  content,
  onContentChange,
}) => {
  return (
    <div className="w-full h-full bg-background pt-16 p-8 overflow-hidden">
      <div className="max-w-4xl mx-auto h-full flex flex-col">
        <Tabs defaultValue="edit" className="flex-1 flex flex-col h-full">
          <div className="flex items-center justify-between mb-4">
            <TabsList>
              <TabsTrigger value="edit">Edit</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="edit" className="flex-1 mt-0 h-full min-h-0">
            <Textarea
              value={content}
              onChange={(e) => onContentChange(e.target.value)}
              placeholder="Start typing your document in Markdown..."
              className="w-full h-full resize-none font-mono text-base p-6 focus-visible:ring-1"
            />
          </TabsContent>

          <TabsContent
            value="preview"
            className="flex-1 mt-0 h-full min-h-0 overflow-hidden"
          >
            <Card className="h-full border-muted">
              <ScrollArea className="h-full">
                <CardContent className="p-8 prose dark:prose-invert max-w-none">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h1: ({ node, ...props }) => (
                        <h1
                          className="text-3xl font-bold mb-4 mt-6 scroll-m-20 tracking-tight"
                          {...props}
                        />
                      ),
                      h2: ({ node, ...props }) => (
                        <h2
                          className="text-2xl font-semibold mb-3 mt-5 scroll-m-20 tracking-tight"
                          {...props}
                        />
                      ),
                      h3: ({ node, ...props }) => (
                        <h3
                          className="text-xl font-semibold mb-2 mt-4 scroll-m-20 tracking-tight"
                          {...props}
                        />
                      ),
                      p: ({ node, ...props }) => (
                        <p
                          className="leading-7 [&:not(:first-child)]:mt-6"
                          {...props}
                        />
                      ),
                      ul: ({ node, ...props }) => (
                        <ul
                          className="my-6 ml-6 list-disc [&>li]:mt-2"
                          {...props}
                        />
                      ),
                      ol: ({ node, ...props }) => (
                        <ol
                          className="my-6 ml-6 list-decimal [&>li]:mt-2"
                          {...props}
                        />
                      ),
                      li: ({ node, ...props }) => (
                        <li className="mt-2" {...props} />
                      ),
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      code: ({ node, inline, ...props }: any) =>
                        inline ? (
                          <code
                            className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold"
                            {...props}
                          />
                        ) : (
                          <code
                            className="block bg-muted p-4 rounded-lg mb-4 overflow-x-auto font-mono text-sm"
                            {...props}
                          />
                        ),
                      blockquote: ({ node, ...props }) => (
                        <blockquote
                          className="mt-6 border-l-2 pl-6 italic text-muted-foreground"
                          {...props}
                        />
                      ),
                      a: ({ node, ...props }) => (
                        <a
                          className="font-medium text-primary underline underline-offset-4"
                          {...props}
                        />
                      ),
                      table: ({ node, ...props }) => (
                        <div className="my-6 w-full overflow-y-auto">
                          <table className="w-full" {...props} />
                        </div>
                      ),
                      th: ({ node, ...props }) => (
                        <th
                          className="border px-4 py-2 text-left font-bold [&[align=center]]:text-center [&[align=right]]:text-right"
                          {...props}
                        />
                      ),
                      td: ({ node, ...props }) => (
                        <td
                          className="border px-4 py-2 text-left [&[align=center]]:text-center [&[align=right]]:text-right"
                          {...props}
                        />
                      ),
                    }}
                  >
                    {content}
                  </ReactMarkdown>
                </CardContent>
              </ScrollArea>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
