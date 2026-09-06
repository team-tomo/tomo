import { AccountTab } from "./-account-tab"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"

export function RightContent() {
  return (
    <Tabs defaultValue="account">
      <TabsList className="gap-1 bg-muted-foreground/10 text-primary">
        <TabsTrigger
          value="account"
          className="px-4 hover:bg-muted-foreground/20"
        >
          Account
        </TabsTrigger>
        <TabsTrigger
          value="history"
          className="px-4 hover:bg-muted-foreground/20"
        >
          History
        </TabsTrigger>
        <TabsTrigger
          value="models"
          className="px-4 hover:bg-muted-foreground/20"
        >
          Model
        </TabsTrigger>
        <TabsTrigger
          value="support"
          className="px-4 hover:bg-muted-foreground/20"
        >
          Support
        </TabsTrigger>
      </TabsList>
      <TabsContent value="account">
        <AccountTab />
      </TabsContent>
      <TabsContent value="history" />
      <TabsContent value="support" />
    </Tabs>
  )
}
