import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  User,
  Briefcase,
  FolderKanban,
   FileText,
  BarChart3,
  Settings,
  Package,
  Receipt,
  ClipboardList,
  Wrench,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const NAV_ITEMS = [
  { path: '/dashboard', label: '数据看板', icon: LayoutDashboard },
  { path: '/tasks', label: '事务管理', icon: ClipboardList },
  { path: '/opportunities', label: '商机池', icon: Briefcase },
  { path: '/projects', label: '项目池', icon: FolderKanban },
  { path: '/quotations', label: '报价管理', icon: Receipt },
  { path: '/customers', label: '客户管理', icon: Users },
  { path: '/contacts', label: '联系人管理', icon: User },
  { path: '/products', label: '商品库', icon: Package },
  { path: '/equipment', label: '设备运维', icon: Wrench },
  { path: '/reports', label: '统计报表', icon: BarChart3 },
  { path: '/system', label: '系统管理', icon: Settings },
  { path: '/contracts', label: '合同订单', icon: FileText },
];

export default function AppSidebar() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const displayUser = user || { name: '管理员', department: '' };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-3 group-data-[state=collapsed]:px-0 group-data-[state=collapsed]:justify-center">
          <div className="size-8 shrink-0 bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-black tracking-wider">
            CRM
          </div>
          <div className="flex-1 min-w-0 group-data-[state=collapsed]:hidden">
            <div className="text-sm font-semibold truncate">客户关系管理系统</div>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup className="p-2">
          <SidebarMenu>
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.path === '/dashboard'
                  ? pathname === '/dashboard'
                  : pathname === item.path || pathname.startsWith(`${item.path}/`);
              return (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton asChild tooltip={item.label} isActive={isActive}>
                    <NavLink
                      to={item.path}
                      end={item.path === '/dashboard'}
                      className="flex items-center gap-2"
                    >
                      <Icon className="size-4 shrink-0" />
                      <span className="group-data-[state=collapsed]:hidden">
                        {item.label}
                      </span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="flex items-center gap-2 px-2 py-2 group-data-[state=collapsed]:px-0 group-data-[state=collapsed]:justify-center">
          <div className="size-8 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-medium">
            {displayUser.name.slice(0, 1)}
          </div>
          <div className="flex-1 min-w-0 group-data-[state=collapsed]:hidden">
            <div className="text-sm font-medium truncate">{displayUser.name}</div>
            <div className="text-xs text-muted-foreground truncate">
              {displayUser.department || ''}
            </div>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
