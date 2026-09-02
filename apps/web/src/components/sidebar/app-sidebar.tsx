import { useNavigate, useRouterState } from "@tanstack/react-router"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Calendar03Icon,
  Chart01Icon,
  Chat01Icon,
  Home04Icon,
  IdentityCardIcon,
  Layers01Icon,
  SpiralsIcon,
  StartUp02Icon,
  Target02Icon,
  UserGroupIcon,
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
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@workspace/ui/components/sidebar"

const data = {
  navMain: [
    {
      title: "Home",
      url: "/",
      icon: <HugeiconsIcon icon={Home04Icon} />,
    },
    {
      title: "Workflows",
      url: "/workflows",
      icon: <HugeiconsIcon icon={Layers01Icon} />,
    },
    {
      title: "Timesheet",
      url: "/timesheet",
      icon: <HugeiconsIcon icon={Calendar03Icon} />,
    },
    {
      title: "Analytics",
      url: "/analytics",
      icon: <HugeiconsIcon icon={Chart01Icon} />,
    },
    {
      title: "Trainings",
      url: "/trainings",
      icon: <HugeiconsIcon icon={Target02Icon} />,
    },
    {
      title: "Engagements",
      url: "/engagements",
      icon: <HugeiconsIcon icon={Chat01Icon} />,
    },
    {
      title: "Directory",
      url: "/directory",
      icon: <HugeiconsIcon icon={UserGroupIcon} />,
    },
  ],
  adminNav: [
    {
      title: "Manage Accounts",
      url: "/manage-accounts",
      icon: <HugeiconsIcon icon={IdentityCardIcon} />,
    },
    {
      title: "Operations",
      url: "/operations",
      icon: <HugeiconsIcon icon={StartUp02Icon} />,
    },
  ],
}

function isPathActive(pathname: string, url: string) {
  if (url === "#") return false
  if (url === "/") return pathname === "/"
  return pathname.startsWith(url)
}

const navItemClassName =
  "hover:bg-sidebar-primary hover:text-sidebar-primary-foreground data-active:bg-sidebar-primary data-active:text-sidebar-primary-foreground"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const navigate = useNavigate()
  const { location } = useRouterState()
  const { data: user } = useCurrentUser()

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="h-12 shrink-0 justify-center border-b bg-sidebar-primary px-2 py-0">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="h-8 p-0 group-data-[collapsible=icon]:p-0! hover:bg-transparent active:bg-transparent"
              render={<a href="/" />}
            >
              <div className="flex size-8 shrink-0 items-center justify-center text-sidebar-primary-foreground">
                <HugeiconsIcon icon={SpiralsIcon} className="size-6!" />
              </div>
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
                    tooltip={{
                      children: item.title,
                      hidden: false,
                    }}
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
            <SidebarMenu>
              {data.adminNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    tooltip={{
                      children: item.title,
                      hidden: false,
                    }}
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
