import {
  AuthenticationState,
  initAuthCreds,
  BufferJSON,
  proto,
} from "@whiskeysockets/baileys";
import { prisma } from "../db/prisma.js";

export async function usePrismaAuthState(userId: string) {
  // Fetch existing session from database
  const session = await prisma.whatsAppSession.findUnique({
    where: { userId },
  });

  let creds = initAuthCreds();
  let keysData: { [key: string]: any } = {};

  if (session) {
    try {
      creds = JSON.parse(session.creds, BufferJSON.reviver);
      keysData = JSON.parse(session.keys, BufferJSON.reviver);
    } catch (e) {
      console.error(`Error parsing WhatsApp session for user ${userId}:`, e);
    }
  }

  const saveCreds = async () => {
    const credsStr = JSON.stringify(creds, BufferJSON.replacer);
    const keysStr = JSON.stringify(keysData, BufferJSON.replacer);

    await prisma.whatsAppSession.upsert({
      where: { userId },
      update: {
        creds: credsStr,
        keys: keysStr,
      },
      create: {
        userId,
        creds: credsStr,
        keys: keysStr,
      },
    });
  };

  const state: AuthenticationState = {
    creds,
    keys: {
      get: async (type, ids) => {
        const data: { [id: string]: any } = {};
        for (const id of ids) {
          let value = keysData[`${type}-${id}`];
          if (value) {
            if (type === "app-state-sync-key" && value) {
              value = proto.Message.AppStateSyncKeyData.fromObject(value);
            }
            data[id] = value;
          }
        }
        return data;
      },
      set: async (data: any) => {
        for (const category in data) {
          for (const id in data[category]) {
            const value = data[category][id];
            const key = `${category}-${id}`;
            if (value) {
              keysData[key] = value;
            } else {
              delete keysData[key];
            }
          }
        }
        await saveCreds();
      },
    },
  };

  return {
    state,
    saveCreds,
  };
}
