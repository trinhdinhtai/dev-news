"use client";

import { LayoutGridIcon, NewspaperIcon } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { Link, usePathname } from "@/i18n/navigation";
import { sourceCategories, sourceDisplay } from "./sources/source-names";

const sources = Object.entries(sourceDisplay).map(([sourceId, display]) => ({ sourceId, ...display }));

/** Each category holding at least one Source, with its Sources, in the order sourceCategories lists them. */
const groups = sourceCategories
  .map((category) => ({ ...category, sources: sources.filter((source) => source.category === category.id) }))
  .filter((group) => group.sources.length > 0);

/** The app's navigation: the Overview, then every Source grouped by category. */
export function AppSidebar() {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();
  // On a phone the sidebar is a sheet over the page; following a link should put it away.
  const close = () => {
    if (isMobile) setOpenMobile(false);
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/" onClick={close} aria-label="Dev News, home" />}>
              <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <NewspaperIcon />
              </span>
              <span className="font-heading text-base font-medium tracking-tight group-data-[collapsible=icon]:hidden">
                Dev News
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={pathname === "/"}
                  tooltip="Overview"
                  render={<Link href="/" onClick={close} />}
                >
                  <LayoutGridIcon />
                  <span>Overview</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {groups.map((group) => (
          <SidebarGroup key={group.id}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.sources.map(({ sourceId, name, icon: Icon }) => {
                  const href = `/sources/${sourceId}`;
                  return (
                    <SidebarMenuItem key={sourceId}>
                      <SidebarMenuButton
                        // Each Time Window of the Source lives under its path.
                        isActive={pathname === href || pathname.startsWith(`${href}/`)}
                        tooltip={name}
                        render={<Link href={href} onClick={close} />}
                      >
                        <Icon />
                        <span>{name}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
