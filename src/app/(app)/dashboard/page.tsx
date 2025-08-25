"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HardDrive, CreditCard, Table2, PlusCircle } from "lucide-react";
import Link from 'next/link';
import { useAuth } from "@/components/auth-provider";
import { formatBytes } from "@/lib/utils";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function DashboardPage() {
  const { user } = useAuth();
  const [tableCount, setTableCount] = useState<number | null>(null);

  useEffect(() => {
    if (user) {
      const tablesCol = collection(db, 'users', user.uid, 'tables');
      getDocs(tablesCol).then(snapshot => {
        setTableCount(snapshot.size);
      });
    }
  }, [user]);

  const storageUsed = user ? formatBytes(user.storageUsed) : '0 Bytes';
  const storageLimit = user ? formatBytes(user.planDetails.storageLimit) : '0 Bytes';
  const storagePercentage = user && user.planDetails.storageLimit > 0 ? (user.storageUsed / user.planDetails.storageLimit) * 100 : 0;

  const creditsRemaining = user ? user.planDetails.creditLimit - user.creditsUsed : 0;
  const creditsLimit = user ? user.planDetails.creditLimit : 0;
  const creditsPercentage = user && user.planDetails.creditLimit > 0 ? (creditsRemaining / creditsLimit) * 100 : 0;

  return (
    <div className="flex-1 space-y-4 p-4 sm:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Welcome back, {user?.name.split(' ')[0]}!</h2>
          <p className="text-muted-foreground">Here's a summary of your account.</p>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{storageUsed} / {storageLimit}</div>
            <p className="text-xs text-muted-foreground">
              {storagePercentage.toFixed(2)}% of storage used
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Credits Remaining
            </CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{creditsRemaining < 0 ? 'Unlimited' : creditsRemaining.toLocaleString()} / {creditsLimit < 0 ? '∞' : creditsLimit.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
               {creditsLimit > 0 ? `${creditsPercentage.toFixed(0)}% of credits remaining` : `You have unlimited credits`}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tables Created</CardTitle>
            <Table2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {tableCount === null ? '...' : `+${tableCount}`}
            </div>
            <p className="text-xs text-muted-foreground">
              Total tables in your account
            </p>
          </CardContent>
        </Card>
      </div>
       <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>You haven't created any tables recently.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Create a <Link href="/presets" className="text-primary hover:underline">new table from a preset</Link> to get started.
          </p>
        </CardContent>
      </Card>
      <Link href="/tables/new">
        <Button className="fixed bottom-20 right-4 h-14 rounded-full shadow-lg md:bottom-8 md:right-8 px-5">
          <PlusCircle className="mr-2 h-5 w-5" />
          <span className="font-semibold">New Table</span>
        </Button>
      </Link>
    </div>
  );
}
