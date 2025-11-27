import { memo } from "react";
import { AdminSidebar } from "./AdminSidebar";

// Memoized version to prevent unnecessary re-renders
export const AdminSidebarMemo = memo(AdminSidebar);
AdminSidebarMemo.displayName = "AdminSidebarMemo";
