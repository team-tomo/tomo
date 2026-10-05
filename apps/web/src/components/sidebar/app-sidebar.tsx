import { useNavigate, useRouterState } from "@tanstack/react-router"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Calendar03Icon,
  Chart01Icon,
  Chat01Icon,
  GeometricShapes01Icon,
  Home03Icon,
  IdentityCardIcon,
  SpiralsIcon,
  StartUp02Icon,
  Target02Icon,
  UserMultiple02Icon,
} from "@hugeicons/core-free-icons"
import { useCurrentUser } from "@/hooks/use-current-user"
import { NavUser } from "@/components/sidebar/nav-user"
import { Separator } from "@workspace/ui/components/separator"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@workspace/ui/components/sidebar"

const data = {
  navMain: [
    {
      title: "Dashboard",
      url: "/",
      icon: <HugeiconsIcon icon={Home03Icon} />,
    },
    {
      title: "Agents",
      url: "/agents",
      icon: <HugeiconsIcon icon={GeometricShapes01Icon} />,
    },
    {
      title: "Timesheet",
      url: "/timesheet",
      icon: <HugeiconsIcon icon={Calendar03Icon} />,
    },
    {
      title: "Trainings",
      url: "/trainings",
      icon: <HugeiconsIcon icon={Target02Icon} />,
    },
    {
      title: "Analytics",
      url: "/analytics",
      icon: <HugeiconsIcon icon={Chart01Icon} />,
    },
    {
      title: "Engagements",
      url: "/engagements",
      icon: <HugeiconsIcon icon={Chat01Icon} />,
    },
    {
      title: "Directory",
      url: "/directory",
      icon: <HugeiconsIcon icon={UserMultiple02Icon} />,
    },
  ],
  adminNav: [
    {
      title: "Operations",
      url: "/operations",
      icon: <HugeiconsIcon icon={StartUp02Icon} />,
    },
    {
      title: "Manage Accounts",
      url: "/accounts",
      icon: <HugeiconsIcon icon={IdentityCardIcon} />,
    },
  ],
}

function isPathActive(pathname: string, url: string) {
  if (url === "#") return false
  if (url === "/") return pathname === "/"
  return pathname.startsWith(url)
}

const navItemClassName =
  "text-foreground/60 hover:bg-sidebar-primary hover:text-sidebar-primary-foreground data-active:bg-sidebar-primary data-active:text-sidebar-primary-foreground dark:text-muted-foreground dark:hover:text-sidebar-primary-foreground dark:data-active:text-sidebar-primary-foreground"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const navigate = useNavigate()
  const { location } = useRouterState()
  const { data: user } = useCurrentUser()

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="h-12 shrink-0 justify-center border-b px-2 py-0">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="h-8 gap-2 p-0 group-data-[collapsible=icon]:p-0! hover:bg-transparent active:bg-transparent"
              render={<a href="/" />}
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
                <HugeiconsIcon icon={SpiralsIcon} className="size-6!" />
              </div>
              <span className="truncate text-base font-bold group-data-[collapsible=icon]:hidden">
                Tomo Platform
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup className="py-2">
          <SidebarGroupContent className="px-1.5 md:px-0">
            <SidebarMenu>
              {data.navMain.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    tooltip={item.title}
                    className={navItemClassName}
                    onClick={() =>
                      item.url !== "#" && navigate({ to: item.url })
                    }
                    isActive={isPathActive(location.pathname, item.url)}
                  >
                    {item.icon}
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
            <Separator className="my-2" />
            <SidebarGroupLabel>Management</SidebarGroupLabel>
            <SidebarMenu>
              {data.adminNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    tooltip={item.title}
                    className={navItemClassName}
                    onClick={() =>
                      item.url !== "#" && navigate({ to: item.url })
                    }
                    isActive={isPathActive(location.pathname, item.url)}
                  >
                    {item.icon}
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>{user && <NavUser user={user} />}</SidebarFooter>
    </Sidebar>
  )
}
