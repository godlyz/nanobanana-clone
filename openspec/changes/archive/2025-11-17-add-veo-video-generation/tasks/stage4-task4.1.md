# Task 4.1: Add Admin Video Management Tab

**File**: Admin dashboard updates
**Estimated Time**: 3 hours
**Dependencies**: Task 2.2 (VideoService)
**Priority**: P2 (Nice to have)

## Overview

Add video management tab to existing admin dashboard:
- View all users' video generation tasks
- Filter by user, status, date range
- Search by prompt keywords
- View task details and videos
- Manual refund for failed tasks
- Task statistics (total, completed, failed, refunded credits)

## Implementation

### Admin Video Tab Component

```typescript
// app/admin/videos/page.tsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export default function AdminVideosPage() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchTasks = async () => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let query = supabase
      .from("video_generation_history")
      .select("*, users(email)");

    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }

    if (searchQuery) {
      query = query.ilike("prompt", `%${searchQuery}%`);
    }

    const { data, error } = await query.order("created_at", { ascending: false }).limit(100);

    if (!error) {
      setTasks(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTasks();
  }, [statusFilter, searchQuery]);

  const columns = [
    { header: "ID", accessor: "id" },
    { header: "User", accessor: (row) => row.users?.email },
    { header: "Prompt", accessor: "prompt" },
    { header: "Status", accessor: (row) => <Badge>{row.status}</Badge> },
    { header: "Credits", accessor: "credit_cost" },
    { header: "Created", accessor: (row) => new Date(row.created_at).toLocaleString() },
    {
      header: "Actions",
      accessor: (row) => (
        <Button size="sm" onClick={() => viewTask(row.id)}>
          View
        </Button>
      ),
    },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Video Management</h1>

      <div className="flex gap-4 mb-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <option value="all">All Status</option>
          <option value="processing">Processing</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
        </Select>

        <Input
          placeholder="Search prompts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <DataTable columns={columns} data={tasks} loading={loading} />
    </div>
  );
}
```

### Add Statistics Dashboard

```typescript
// components/admin/video-stats.tsx
export function VideoStats() {
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    failed: 0,
    processing: 0,
    totalCredits: 0,
    refundedCredits: 0,
  });

  // Fetch stats from database...

  return (
    <div className="grid grid-cols-3 gap-4 mb-6">
      <Card>
        <CardHeader>Total Videos</CardHeader>
        <CardContent>{stats.total}</CardContent>
      </Card>
      <Card>
        <CardHeader>Completed</CardHeader>
        <CardContent>{stats.completed}</CardContent>
      </Card>
      <Card>
        <CardHeader>Failed (Refunded)</CardHeader>
        <CardContent>
          {stats.failed} ({stats.refundedCredits} credits)
        </CardContent>
      </Card>
    </div>
  );
}
```

## Acceptance Criteria

- [ ] Admin video management page created
- [ ] Table shows all video tasks across users
- [ ] Filter by status works
- [ ] Search by prompt works
- [ ] Statistics dashboard shows totals
- [ ] View task details button works
- [ ] Manual refund button (if needed)
- [ ] Only accessible by admin users (RLS)
