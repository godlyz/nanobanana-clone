import crypto from "crypto"

/**
 * 检查密码是否在 HaveIBeenPwned 泄漏列表中
 * 使用 k-anonymity 接口，仅发送 SHA1 前 5 位
 */
export async function isPasswordCompromised(password: string): Promise<boolean> {
  const sha1 = crypto.createHash("sha1").update(password).digest("hex").toUpperCase()
  const prefix = sha1.slice(0, 5)
  const suffix = sha1.slice(5)

  const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
    headers: {
      "Add-Padding": "true",
      "User-Agent": "nanobanana-security-check"
    },
    cache: "no-store"
  })

  if (!response.ok) {
    throw new Error(`HIBP 请求失败: ${response.status}`)
  }

  const text = await response.text()

  return text.split("\n").some(line => {
    const [candidateSuffix] = line.trim().split(":")
    return candidateSuffix === suffix
  })
}
