"use client";

import { Button } from "@/components/ui/button";
import { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useRef, useState } from "react";

export default function ProtectedPage() {
  const supabase = createClient();
  const [userID, setUserID] = useState<string>();
  const [msgs, setMsgs] = useState<string[]>([]);
  const ref = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      console.log("Current User:", user?.id); // Should print your ID, not undefined
      setUserID(user?.id);
    };

    checkUser();

    const connectToRealtime = async () => {
      // 2. GET THE SESSION FIRST
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        console.log("🚫 No session yet, skipping Realtime connection.");
        return;
      }

      console.log(
        "✅ Authenticated! Connecting to Realtime as:",
        session.user.id
      );

      const channel = supabase
        .channel("secure-channel")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "leads", // Your table
          },
          (payload) => {
            console.log("📩 New Message:", payload);
          }
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            console.log("Connected!");
          }
        });

      return channel;
    };

    let channel: any;

    connectToRealtime().then((ch) => {
      channel = ch;
    });

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const sendMessage = async () => {
    if (ref.current) {
      await ref.current.send({
        type: "broadcast",
        event: "test-message",
        payload: {
          message: "Hi there!",
        },
      });
    } else {
      console.log("You're not connected yet!");
    }
    setMsgs((prev: string[]) => [...prev, "Hi there"]);
  };

  const insertData = async () => {
    return supabase
      .from("leads")
      .insert([{ email: "JohnDoe@gmail.com" }])
      .match((error: any) => {
        console.error("Error inserting data:", error);
      });
  };

  return (
    <div className="flex-1 w-full flex flex-col gap-12">
      <Button onClick={insertData}>insert data</Button>
      <Button onClick={sendMessage} className="text-xl">
        Send!
      </Button>
      {msgs.map((msg, i) => (
        <h1 key={i}>{msg}</h1>
      ))}
    </div>
  );
}
