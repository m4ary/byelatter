export type Protocol = "imap" | "pop3";

export interface ServerConfig {
  host: string;
  port: number;
  /** true = implicit TLS (e.g. 993/995/465), false = plain/STARTTLS */
  secure: boolean;
}

/** Everything needed to talk to a mailbox. Stored only inside the encrypted session cookie. */
export interface MailAccount {
  providerId: string;
  protocol: Protocol;
  email: string;
  username: string;
  password: string;
  incoming: ServerConfig;
  smtp?: ServerConfig;
  /** Accept self-signed certificates (e.g. Proton Mail Bridge on localhost). */
  allowSelfSigned?: boolean;
}

export interface UnsubscribeMethods {
  /** http(s) links from List-Unsubscribe */
  urls: string[];
  /** mailto: links from List-Unsubscribe */
  mailtos: string[];
  /** RFC 8058 List-Unsubscribe-Post: List-Unsubscribe=One-Click present */
  oneClick: boolean;
}

/** A sender that has sent the user list/bulk mail, aggregated over scanned messages. */
export interface Newsletter {
  /** Stable grouping key (sender address, lowercased) */
  id: string;
  name: string;
  address: string;
  listId?: string;
  count: number;
  latestSubject: string;
  latestDate: string | null;
  unsubscribe: UnsubscribeMethods;
}

export interface ScanResult {
  newsletters: Newsletter[];
  scanned: number;
  total: number;
  mailbox: string;
}

export type UnsubscribeOutcome =
  | { status: "done"; method: "one-click" | "mailto"; detail: string }
  | { status: "manual"; url: string; detail: string }
  | { status: "failed"; detail: string };
