"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChatMessage, MessageAuthor } from "../../types";
import { streamChat } from "../services/geminiService";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, Users, Bot, MessageSquare } from "lucide-react";

interface ChatPanelProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  onGenerateDiagram?: (prompt: string) => void;
  teamMessages: ChatMessage[];
  onSendTeamMessage: (text: string) => void;
}

enum ChatTab {
  TEAM = "Team",
  GEMINI = "Gemini",
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  isOpen,
  setIsOpen,
  messages,
  setMessages,
  onGenerateDiagram,
  teamMessages,
  onSendTeamMessage,
}) => {
  const [activeTab, setActiveTab] = useState<string>(ChatTab.GEMINI);
  const [userInput, setUserInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages, activeTab]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim()) return;

    if (activeTab === ChatTab.TEAM) {
      onSendTeamMessage(userInput.trim());
      setUserInput("");
      return;
    }

    if (isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now(),
      author: MessageAuthor.USER,
      text: userInput.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setUserInput("");
    setIsLoading(true);

    const geminiMessageId = Date.now() + 1;
    setMessages((prev) => [
      ...prev,
      { id: geminiMessageId, author: MessageAuthor.GEMINI, text: "" },
    ]);

    try {
      let fullResponse = "";
      for await (const chunk of streamChat(userMessage.text)) {
        fullResponse += chunk;

        // Check for diagram generation tag
        const tagRegex = /\[\[GENERATE_DIAGRAM:\s*(.*?)\]\]/;
        const match = fullResponse.match(tagRegex);

        let displayText = fullResponse;
        if (match) {
          displayText = fullResponse.replace(match[0], "").trim();
        }

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === geminiMessageId ? { ...msg, text: displayText } : msg
          )
        );

        if (match && onGenerateDiagram) {
          // We found a tag, trigger generation but don't stop streaming immediately
          // as there might be more text. However, usually the tag is at the end.
          // To avoid multiple triggers, we could check if we already triggered it,
          // but for now let's just trigger it once the stream is done or handle it carefully.
          // Better approach: Wait until stream finishes to trigger?
          // Or trigger immediately and remove tag?
          // Let's trigger ONLY when the tag is fully formed and we are processing the chunk.
          // But since we are in a loop, we might trigger multiple times if we are not careful.
          // Let's just strip it for display and trigger at the end?
          // No, we want it to happen as soon as possible.
          // Let's use a flag or just check if the tag is present in the *current* chunk?
          // No, chunk might be partial.
          // Let's rely on the final processing.
        }
      }

      // After stream finishes, check for tag again in the full response
      const tagRegex = /\[\[GENERATE_DIAGRAM:\s*(.*?)\]\]/;
      const match = fullResponse.match(tagRegex);
      if (match && onGenerateDiagram) {
        onGenerateDiagram(match[1]);
      }
    } catch (error) {
      console.error("Gemini API error:", error);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === geminiMessageId
            ? {
                ...msg,
                text: "Sorry, I encountered an error. Please try again.",
              }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const geminiMessages = messages.filter(
    (m) => m.author === MessageAuthor.GEMINI || m.author === MessageAuthor.USER
  );

  return (
    <>
      <Sheet open={isOpen} onOpenChange={setIsOpen} modal={false}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-sm flex flex-col p-0 gap-0 border-l bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60"
        >
          <SheetHeader className="p-4 border-b">
            <SheetTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Chat
            </SheetTitle>
          </SheetHeader>

          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex-1 flex flex-col h-full overflow-hidden"
          >
            <div className="px-4 pt-4">
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger
                  value={ChatTab.GEMINI}
                  className="flex items-center gap-2"
                >
                  <Bot size={16} /> Gemini
                </TabsTrigger>
                <TabsTrigger
                  value={ChatTab.TEAM}
                  className="flex items-center gap-2"
                >
                  <Users size={16} /> Team
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent
              value={ChatTab.GEMINI}
              className="flex-1 flex flex-col overflow-hidden mt-2 data-[state=inactive]:hidden"
            >
              <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
                <div className="space-y-4">
                  {geminiMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex items-start gap-3 ${
                        msg.author === MessageAuthor.USER ? "justify-end" : ""
                      }`}
                    >
                      {msg.author === MessageAuthor.GEMINI && (
                        <Avatar className="w-8 h-8 border">
                          <AvatarFallback>G</AvatarFallback>
                          <AvatarImage src="/gemini-icon.png" />
                        </Avatar>
                      )}
                      <div
                        className={`max-w-[85%] px-4 py-2 rounded-lg text-sm ${
                          msg.author === MessageAuthor.USER
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <div
                          className="prose dark:prose-invert max-w-none prose-p:my-0 prose-pre:my-2"
                          dangerouslySetInnerHTML={{
                            __html: msg.text.replace(/\n/g, "<br />"),
                          }}
                        />
                        {msg.author === MessageAuthor.GEMINI &&
                          msg.text === "" && (
                            <div className="flex items-center space-x-1 h-5">
                              <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce delay-75" />
                              <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce delay-150" />
                              <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce delay-300" />
                            </div>
                          )}
                      </div>
                    </div>
                  ))}
                  <div ref={bottomRef} />
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent
              value={ChatTab.TEAM}
              className="flex-1 flex flex-col overflow-hidden mt-2 data-[state=inactive]:hidden"
            >
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {teamMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex items-start gap-3 ${
                        msg.author === MessageAuthor.USER
                          ? "flex-row-reverse"
                          : ""
                      }`}
                    >
                      <Avatar className="w-8 h-8 border">
                        {msg.authorPhotoURL && (
                          <AvatarImage src={msg.authorPhotoURL} />
                        )}
                        <AvatarFallback
                          style={{ backgroundColor: msg.authorColor }}
                        >
                          {msg.authorName?.[0] || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div
                        className={`flex flex-col gap-1 ${
                          msg.author === MessageAuthor.USER
                            ? "items-end"
                            : "items-start"
                        }`}
                      >
                        <span className="text-xs font-bold text-muted-foreground">
                          {msg.authorName}
                        </span>
                        <div
                          className={`px-4 py-2 rounded-lg text-sm ${
                            msg.author === MessageAuthor.USER
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {msg.text}
                        </div>
                      </div>
                    </div>
                  ))}
                  {teamMessages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground mt-20">
                      <Users className="w-12 h-12 mb-4 opacity-20" />
                      <p className="font-medium">Team Chat</p>
                      <p className="text-sm opacity-70">No messages yet.</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
              <div ref={bottomRef} />
            </TabsContent>
          </Tabs>
          <div className="p-4 border-t bg-background">
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <Input
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder={
                  activeTab === ChatTab.GEMINI
                    ? isLoading
                      ? "Gemini is thinking..."
                      : "Ask Gemini..."
                    : "Type a message..."
                }
                disabled={activeTab === ChatTab.GEMINI && isLoading}
                className="flex-1"
              />
              <Button
                type="submit"
                size="icon"
                disabled={
                  (activeTab === ChatTab.GEMINI && isLoading) ||
                  !userInput.trim()
                }
              >
                <Send size={18} />
              </Button>
            </form>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
