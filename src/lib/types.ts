
import type { Timestamp } from "firebase/firestore";

export type SocialLinks = {
  koFi?: string;
  patreon?: string;
  paypal?: string;
  customLink?: string;
};

export type FavoriteLink = 'koFi' | 'patreon' | 'paypal';

export type User = {
  uid: string;
  name: string;
  username?: string;
  isVerified?: boolean;
  email: string | null;
  avatarUrl: string | null;
  subscriptionPlan: 'Free' | 'Starter' | 'Creator' | 'Power' | 'Lifetime';
  creditsUsed: number;
  storageUsed: number; // in bytes
  planDetails: {
    creditLimit: number;
    storageLimit: number; // in bytes
  };
  paddleSubscriptionId?: string;
  paddleCustomerId?: string;
  planExpiryDate?: Date | null;
  subscriptionEndsAt?: Date | null;
  // Profile fields
  bio?: string;
  socialLinks?: SocialLinks;
  favoriteLink?: FavoriteLink | null;
  totalDownloads?: number;
  // Rate limiting fields
  lastNameUpdate?: Date;
  lastUsernameUpdate?: Date;
  exportTimestamps?: Date[];
};

export type Table = {
  id: string;
  name:string;
  lastEdited: Date;
  createdAt: Date;
  fileType: string;
  presetString: string;
  tags: string[];
  data: Record<string, any>[];
  lastExported?: Date;
  size?: number;
};

export type Preset = {
  id:string;
  name: string;
  description: string;
  authorId: string;
  authorName: string;
  isPublic: boolean;
  isOfficial: boolean; // From original community list, not a user
  downloadCount: number;
  presetString: string;
  tags: string[];
  // Denormalized author data for easier display
  authorUsername?: string;
  authorAvatarUrl?: string | null;
  authorFavoriteLink?: FavoriteLink | null;
  authorSocialLinks?: SocialLinks;
};

export type Plan = {
  name: 'Free' | 'Starter' | 'Creator' | 'Power';
  description: string;
  features: string[];
  isPopular?: boolean;
  creditLimit: number;
  storageLimit: number;
  monthly: {
    price: string;
    paddlePriceId: string;
  };
  annual: {
    price: string;
    paddlePriceId: string;
    savings: string;
  };
  oneTime?: {
    name: string;
    price: string;
    paddlePriceId: string;
    credits: number;
    features: string[];
  };
};


export type ColumnDef = {
  name: string;
  value: string;
  type: "text" | "number" | "boolean" | "json";
  important: "yes" | "no";
  write: string;
};

export type ParsedPreset = {
  columns: ColumnDef[];
  exportAs: string;
  writeAs:string;
};
