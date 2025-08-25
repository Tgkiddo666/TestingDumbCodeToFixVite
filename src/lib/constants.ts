
import type { Plan } from "@/lib/types";

// Price calculation: Annual is 10x monthly price. One-time is slightly more than monthly.
export const PRICING_PLANS: Plan[] = [
  {
    name: "Free",
    description: "Perfect for personal projects and getting started.",
    features: [
      "100 credits/month",
      "10 MB cloud storage",
      "Create unlimited tables",
      "Public table sharing links",
      "Community preset access",
    ],
    creditLimit: 100,
    storageLimit: 10 * 1024 * 1024, // 10MB
    monthly: { price: "$0", paddlePriceId: "" },
    annual: { price: "$0", paddlePriceId: "", savings: "" },
  },
  {
    name: "Starter",
    description: "For hobbyists and power users who need more resources and AI.",
    features: [
      "2,000 credits/month",
      "250 MB storage",
      "AI preset generation",
      "AI bulk completion",
      "All features from Free",
    ],
    creditLimit: 2000,
    storageLimit: 250 * 1024 * 1024, // 250MB
    monthly: {
      price: "$5.99",
      paddlePriceId: "pri_01jyyscrfhvx1g3mzz29ntk3pv",
    },
    annual: {
      price: "$59.90",
      paddlePriceId: "pri_01jyysx39vsq50qgpezfmh4jv8",
      savings: "Save 2 months",
    },
    oneTime: {
      name: "Starter Pass",
      price: "$5.99",
      paddlePriceId: "pri_01jyywpn0qdhpfet6mne5x59my",
      credits: 2000,
      features: [
        "30-day pass to all Starter features",
        "Includes 2,000 credits to use",
        "AI preset generation",
        "AI bulk completion",
        "No recurring subscription",
      ],
    },
  },
  {
    name: "Creator",
    isPopular: true,
    description: "For creators and professionals who need advanced collaboration.",
    features: [
      "15,000 credits/month",
      "2 GB storage",
      "Collaborative editing (soon)",
      "Direct file links (soon)",
      "All features from Starter",
    ],
    creditLimit: 15000,
    storageLimit: 2 * 1024 * 1024 * 1024, // 2GB
    monthly: {
      price: "$12.99",
      paddlePriceId: "pri_01jyysjdx412vm0c6jce679x4g",
    },
    annual: {
      price: "$129.90",
      paddlePriceId: "pri_01jyyt1xk15fcj0dksey488tqw",
      savings: "Save 2 months",
    },
    oneTime: {
      name: "Creator Pass",
      price: "$15.99",
      paddlePriceId: "pri_01jyytj6s0kd02n4r5w2wjztnj",
      credits: 15000,
      features: [
        "30-day pass to all Creator features",
        "Includes 15,000 credits to use",
        "Collaborative features (soon)",
        "Ideal for larger projects",
        "No recurring subscription",
      ],
    },
  },
  {
    name: "Power",
    description: "For power users and teams that require maximum performance.",
    features: [
      "100,000 credits/month",
      "15 GB storage",
      "Access to faster, stronger AI models",
      "Priority support",
      "All features from Creator",
    ],
    creditLimit: 100000,
    storageLimit: 15 * 1024 * 1024 * 1024, // 15GB
    monthly: {
      price: "$34.99",
      paddlePriceId: "pri_01jyysmqfentz1jb6f6jv8mgsr",
    },
    annual: {
      price: "$349.90",
      paddlePriceId: "pri_01jyyt62a3skbqd8rd56p99c5t",
      savings: "Save 2 months",
    },
    oneTime: {
        name: "Power Pass",
        price: "$40.99",
        paddlePriceId: "pri_01jyytmmab4pxpsjv302pvvpnf",
        credits: 100000,
        features: [
            "30-day pass to all Power features",
            "Includes 100,000 credits to use",
            "Access to faster, stronger AI models",
            "Perfect for intensive use",
            "No recurring subscription",
        ],
    },
  },
];
