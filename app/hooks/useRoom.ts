/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { db, auth } from "@/lib/firebase";
import {
  ref,
  onValue,
  set,
  update,
  push,
  remove,
  onDisconnect,
} from "firebase/database";
import {
  WhiteboardElement,
  Collaborator,
  Point,
  ChatMessage,
  MessageAuthor,
} from "@/types";
import { nanoid } from "nanoid";
import { throttle } from "@/app/utils";
import { signInAnonymously, onAuthStateChanged, User } from "firebase/auth";

export const useRoom = (
  roomId: string,
  initialElements: WhiteboardElement[]
) => {
  const [elements, setElements] =
    useState<WhiteboardElement[]>(initialElements);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeCallParticipants, setActiveCallParticipants] = useState<
    string[]
  >([]);

  // Use a ref to track if we are currently updating from remote to avoid loops
  const isRemoteUpdate = useRef(false);

  const [authError, setAuthError] = useState<Error | null>(null);

  // Initialize Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        setUserId(user.uid);
        setAuthError(null);
      } else {
        signInAnonymously(auth)
          .then((userCredential) => {
            setCurrentUser(userCredential.user);
            setUserId(userCredential.user.uid);
            setAuthError(null);
          })
          .catch((error) => {
            console.error("Error signing in anonymously:", error);
            setAuthError(error);
            // Fallback for guests if auth fails (e.g. admin restricted)
            // Generate a random ID for this session so they can still collaborate if rules allow
            if (!userId) {
              const guestId = "guest_" + nanoid();
              setUserId(guestId);
            }
          });
      }
    });
    return () => unsubscribe();
  }, []);

  // Sync Elements
  useEffect(() => {
    if (!roomId) return;

    const elementsRef = ref(db, `rooms/${roomId}/elements`);

    const unsubscribe = onValue(elementsRef, (snapshot) => {
      const data = snapshot.val();
      console.log(
        "Firebase: Received elements update",
        data ? "data present" : "no data"
      );
      if (data) {
        isRemoteUpdate.current = true;
        setElements(data);
        setTimeout(() => {
          isRemoteUpdate.current = false;
        }, 0);
      }
    });

    return () => unsubscribe();
  }, [roomId]);

  // Sync Collaborators (Cursors)
  useEffect(() => {
    if (!roomId || !userId) return;

    const userRef = ref(db, `rooms/${roomId}/users/${userId}`);
    const usersRef = ref(db, `rooms/${roomId}/users`);

    // Set initial presence
    const color = "#" + Math.floor(Math.random() * 16777215).toString(16);

    let name = `Guest ${userId.slice(0, 4)}`;
    let photoURL = "";

    if (currentUser) {
      if (currentUser.displayName) {
        name = currentUser.displayName;
      } else if (currentUser.email) {
        name = currentUser.email.split("@")[0];
      } else if (!currentUser.isAnonymous) {
        name = "User";
      }
      photoURL = currentUser.photoURL || "";
    }

    console.log("Firebase: Setting presence for user", userId, name);

    set(userRef, {
      id: userId,
      name,
      color,
      position: { x: 0, y: 0 },
      lastActive: Date.now(),
      photoURL,
    });

    // Remove on disconnect
    onDisconnect(userRef).remove();

    // Listen for other users
    const unsubscribe = onValue(usersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const users: Collaborator[] = (Object.values(data) as any[]).filter(
          (u: any) => u && u.id
        );
        // Include all users, including self, so everyone is shown in the top bar
        setCollaborators(users);
      } else {
        setCollaborators([]);
      }
    });

    return () => {
      unsubscribe();
      remove(userRef);
    };
  }, [roomId, userId]);

  // Sync Messages
  useEffect(() => {
    if (!roomId || !userId) return;

    const messagesRef = ref(db, `rooms/${roomId}/messages`);

    const unsubscribe = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const loadedMessages: ChatMessage[] = Object.entries(data).map(
          ([key, val]: [string, any]) => ({
            id: key,
            text: val.text,
            author:
              val.senderId === userId
                ? MessageAuthor.USER
                : MessageAuthor.COLLABORATOR,
            authorName: val.senderName,
            authorColor: val.senderColor,
            authorPhotoURL: val.senderPhotoURL,
            // We can store timestamp if needed, but ChatMessage doesn't have it explicitly in the interface shown before.
            // But we can use it for sorting.
          })
        );
        // Sort by id (assuming push keys are chronological) or timestamp if available
        // Firebase push keys are chronologically sorted.
        setMessages(loadedMessages);
      } else {
        setMessages([]);
      }
    });

    return () => unsubscribe();
  }, [roomId, userId]);

  // Sync Active Call Participants
  useEffect(() => {
    if (!roomId) return;

    const callStateRef = ref(db, `rooms/${roomId}/callState`);

    const unsubscribe = onValue(callStateRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const participants = Object.values(data).map((p: any) => p.name);
        setActiveCallParticipants(participants);
      } else {
        setActiveCallParticipants([]);
      }
    });

    return () => unsubscribe();
  }, [roomId]);

  const joinCall = useCallback(() => {
    if (!roomId || !userId) return;

    const myName = collaborators.find((c) => c.id === userId)?.name || "User";
    const userCallRef = ref(db, `rooms/${roomId}/callState/${userId}`);

    set(userCallRef, {
      id: userId,
      name: myName,
      joinedAt: Date.now(),
    });

    onDisconnect(userCallRef).remove();
  }, [roomId, userId, collaborators]);

  const leaveCall = useCallback(() => {
    if (!roomId || !userId) return;

    const userCallRef = ref(db, `rooms/${roomId}/callState/${userId}`);
    remove(userCallRef);
  }, [roomId, userId]);

  const sendMessage = useCallback(
    (text: string) => {
      if (!roomId || !userId) return;

      const messagesRef = ref(db, `rooms/${roomId}/messages`);
      const newMessageRef = push(messagesRef);

      const myColor =
        collaborators.find((c) => c.id === userId)?.color || "#000";
      const myName = collaborators.find((c) => c.id === userId)?.name || "User";
      const myPhotoURL = collaborators.find((c) => c.id === userId)?.photoURL;

      set(newMessageRef, {
        text,
        senderId: userId,
        senderName: myName,
        senderColor: myColor,
        senderPhotoURL: myPhotoURL,
        timestamp: Date.now(),
      });
    },
    [roomId, userId, collaborators]
  );
  // Throttle updates to Firebase to avoid overwhelming the database
  const throttledUpdateElements = useMemo(
    () =>
      throttle((newElements: WhiteboardElement[]) => {
        if (!roomId) return;
        set(ref(db, `rooms/${roomId}/elements`), newElements).catch((err) => {
          console.error("Firebase: Write failed", err);
        });
      }, 50), // 50ms throttle
    [roomId]
  );

  const updateElements = useCallback(
    (newElements: WhiteboardElement[]) => {
      if (isRemoteUpdate.current) {
        return;
      }
      throttledUpdateElements(newElements);
    },
    [throttledUpdateElements]
  );

  const updateCursor = useCallback(
    (point: Point) => {
      if (!roomId || !userId) return;

      update(ref(db, `rooms/${roomId}/users/${userId}`), {
        position: point,
        lastActive: Date.now(),
      });
    },
    [roomId, userId]
  );

  return {
    elements,
    setElements: (
      newElements:
        | WhiteboardElement[]
        | ((prev: WhiteboardElement[]) => WhiteboardElement[])
    ) => {
      // Handle functional updates
      if (typeof newElements === "function") {
        setElements((prev) => {
          const updated = newElements(prev);
          updateElements(updated);
          return updated;
        });
      } else {
        setElements(newElements);
        updateElements(newElements);
      }
    },
    collaborators,
    updateCursor,
    currentUser,
    authError,
    userId,
    messages,
    sendMessage,
    activeCallParticipants,
    joinCall,
    leaveCall,
  };
};
