import { useEffect, useState } from "react"
import { Icon, MenuBarExtra, getPreferenceValues, open } from "@raycast/api"
import { runAppleScript, useCachedPromise } from "@raycast/utils"
import fetch from "node-fetch"
import { Agent } from "node:https"

interface Preferences {
  apiKey: string
  apiCredential: string
}
const API = `https://principalfinancial.xmatters.com/api/xm/1/on-call-summary?groups=mobileapp`
let agent = new Agent({
  rejectUnauthorized: false,
})

export default function Command() {
  let { apiKey, apiCredential } = getPreferenceValues<Preferences>()
  let { data, isLoading } = useCachedPromise(
    async () => {
      let res = await fetch(API, {
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${apiKey}:${apiCredential}`
          ).toString("base64")}`,
        },
        agent,
      })
      let data = (await res.json()) as any

      let primaryName = getFullName(data[0].recipient)
      let username = await runAppleScript(`
        tell application "System Events"
          full name of current user
        end tell
      `)

      let isCurrentUserPrimary = primaryName === username
      return { members: data, isCurrentUserPrimary }
    },
    [],
    {
      initialData: {
        members: [{ recipient: { firstName: "Loading", lastName: "user..." } }],
        isCurrentUserPrimary: false,
      },
    }
  )
  let Spinner = useMenuBarSpinner(isLoading)

  function getFullName(member: { firstName: string; lastName: string }) {
    return `${member.firstName} ${member.lastName}`
  }

  return (
    <MenuBarExtra
      icon={Spinner ?? Icon.Phone}
      title={data?.isCurrentUserPrimary ? "I'm on call" : ""}
    >
      <MenuBarExtra.Section title="Primary">
        <MenuBarExtra.Item title={getFullName(data.members[0].recipient)} />
      </MenuBarExtra.Section>
      {data.members.length >= 2 ? (
        <MenuBarExtra.Section title="Backups">
          <MenuBarExtra.Item title={getFullName(data.members[1].recipient)} />
          <MenuBarExtra.Item title={getFullName(data.members[2].recipient)} />
        </MenuBarExtra.Section>
      ) : (
        <></>
      )}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Open xMatters..."
          onAction={() =>
            open(
              "https://principalfinancial.xmatters.com/xmatters/ui/groups/b7cabe86-af8b-490a-8818-6c985f9d0d34/overview"
            )
          }
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  )
}

let icons = [
  Icon.CircleProgress,
  Icon.CircleProgress25,
  Icon.CircleProgress50,
  Icon.CircleProgress75,
  Icon.CircleProgress100,
]
function useMenuBarSpinner(show: boolean) {
  let [iconIndex, setIconIndex] = useState(0)

  useEffect(() => {
    let id = setInterval(() => {
      setIconIndex((i) => (i + 1) % 5)
    }, 100)

    return () => {
      clearInterval(id)
    }
  }, [show])

  return show ? icons[iconIndex] : undefined
}
