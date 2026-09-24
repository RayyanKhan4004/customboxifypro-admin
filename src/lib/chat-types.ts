export interface ChatCustomer {
  _id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

export interface Conversation {
  _id: string;
  customerId: ChatCustomer | string;
  customer?: ChatCustomer | null;
  waId: string;
  assignedTo: string | null;
  status: "open" | "resolved";
  lastInboundAt: string | null;
  lastMessageAt: string | null;
  lastMessagePreview: string;
  unreadCount: number;
  quoteIds: string[];
}

export interface ChatMessage {
  _id: string;
  direction: "inbound" | "outbound" | "note";
  text: string;
  type: string;
  status: string;
  attachment: {
    providerMediaId?: string;
    mimeType?: string;
    caption?: string;
  } | null;
  createdAt: string;
  failure: string | null;
}

export interface ChatQuote {
  _id: string;
  quoteNumber?: string;
  productName: string | null;
  quantity: number | null;
  status: string;
  createdAt: string;
}

export interface MessageHistory {
  data: ChatMessage[];
  nextCursor: string | null;
}
