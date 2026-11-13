// Подписка на рассылку с сайта (8.2, double opt-in). Доступно в серверном коде без импорта.
//
// 1. requestSubscription: запись с хэшем ссылки и письмо гостю на его языке. Лида ещё нет.
// 2. confirmSubscription: гость нажал «Подтвердить» на странице из письма — запись подтверждена,
//    у контакта (найденного по почте или нового) рассылка «да», автотег «подписка с сайта».
//
// Ответ формы всегда одинаковый — и для нового адреса, и для уже подписанного: по форме
// нельзя узнать, подписан ли чужой адрес.
import { createHash, randomBytes } from 'node:crypto'
import { and, eq, gt, isNull } from 'drizzle-orm'
import { leads, leadTags, subscriptions } from '../db/schema'
import type { ContentLocale } from '#shared/locales'
import { PRIVACY_POLICY_VERSION } from '#shared/requests'
import {
  SUBSCRIBE_LINK_HOURS,
  SUBSCRIBE_RESEND_MINUTES,
  type SubscribeConfirmResult,
} from '#shared/subscriptions'

/** Автотег подписчика. Уедет в Mautic как есть (8.2) — менять осторожно */
export const SUBSCRIBE_TAG = 'подписка с сайта'

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')

const letters: Record<ContentLocale, { subject: string; text: (link: string) => string }> = {
  ru: {
    subject: 'Подтвердите подписку — Tavern Peetri Toll',
    text: (link) =>
      [
        'Здравствуйте!',
        '',
        'Кто-то, вероятно вы, подписал этот адрес на новости и приглашения таверны-музея',
        'Peetri Toll в Палдиски — письмо раз в месяц.',
        '',
        'Чтобы подписка заработала, откройте ссылку и нажмите «Подтвердить подписку»:',
        link,
        '',
        `Ссылка действует ${SUBSCRIBE_LINK_HOURS} часов. Если вы не подписывались, просто`,
        'не обращайте внимания на это письмо — без подтверждения мы ничего не пришлём.',
        '',
        'Tavern Peetri Toll, Mere 10, Палдиски',
      ].join('\n'),
  },
  et: {
    subject: 'Kinnitage uudiskirja tellimine — Tavern Peetri Toll',
    text: (link) =>
      [
        'Tere!',
        '',
        'Keegi, tõenäoliselt teie, tellis sellele aadressile Paldiski kõrtsi-muuseumi',
        'Peetri Toll uudised ja kutsed — üks kiri kuus.',
        '',
        'Tellimuse kinnitamiseks avage link ja vajutage „Kinnitan tellimuse“:',
        link,
        '',
        `Link kehtib ${SUBSCRIBE_LINK_HOURS} tundi. Kui te ei tellinud, jätke see kiri lihtsalt`,
        'tähelepanuta — ilma kinnituseta me teile midagi ei saada.',
        '',
        'Tavern Peetri Toll, Mere 10, Paldiski',
      ].join('\n'),
  },
  en: {
    subject: 'Confirm your subscription — Tavern Peetri Toll',
    text: (link) =>
      [
        'Hello!',
        '',
        'Someone, probably you, subscribed this address to news and invitations from',
        'the Peetri Toll tavern and museum in Paldiski — one email a month.',
        '',
        'To start the subscription, open the link and press “Confirm subscription”:',
        link,
        '',
        `The link is valid for ${SUBSCRIBE_LINK_HOURS} hours. If you did not subscribe, just`,
        'ignore this email — without confirmation we will not send you anything.',
        '',
        'Tavern Peetri Toll, Mere 10, Paldiski',
      ].join('\n'),
  },
}

/**
 * Принять адрес из формы. Уже подписан — письмо не шлём. Письмо на этот адрес уходило
 * недавно — второе не шлём (ссылка из первого ещё действует). Не удалось отправить — ошибка:
 * гость должен знать, что письма не будет.
 */
export async function requestSubscription(email: string, locale: ContentLocale) {
  const db = useDb()
  const [lead] = await db
    .select({ marketing: leads.marketing })
    .from(leads)
    .where(eq(leads.email, email))
    .limit(1)
  if (lead?.marketing === 'yes') return

  const since = new Date(Date.now() - SUBSCRIBE_RESEND_MINUTES * 60_000)
  const [recent] = await db
    .select({ id: subscriptions.id })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.email, email),
        isNull(subscriptions.confirmedAt),
        gt(subscriptions.createdAt, since),
      ),
    )
    .limit(1)
  if (recent) return

  if (!mailConfigured()) {
    throw createError({ statusCode: 503, message: 'Почта на сервере не настроена' })
  }

  const token = randomBytes(24).toString('base64url')
  const [row] = await db
    .insert(subscriptions)
    .values({
      email,
      locale,
      tokenHash: hashToken(token),
      policyVersion: PRIVACY_POLICY_VERSION,
      expiresAt: new Date(Date.now() + SUBSCRIBE_LINK_HOURS * 3600_000),
    })
    .returning({ id: subscriptions.id })

  const link = `${siteUrl()}/${locale}/subscribe?token=${token}`
  try {
    await sendMail({
      to: email,
      subject: letters[locale].subject,
      text: letters[locale].text(link),
    })
  } catch (e) {
    console.error(`Подписка № ${row!.id}: письмо не ушло`, e)
    // Письма нет — и записи не нужно: иначе следующая попытка упрётся в «недавно отправляли»
    await db.delete(subscriptions).where(eq(subscriptions.id, row!.id))
    throw createError({
      statusCode: 503,
      message: 'Не удалось отправить письмо. Попробуйте позже',
    })
  }
}

/** Гость нажал «Подтвердить подписку» на странице из письма */
export async function confirmSubscription(token: string): Promise<SubscribeConfirmResult> {
  return await useDb().transaction(async (tx) => {
    const [sub] = await tx
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.tokenHash, hashToken(token)))
      .for('update')
      .limit(1)
    if (!sub) return 'unknown'
    if (sub.confirmedAt) return 'already'
    if (sub.expiresAt < new Date()) return 'expired'

    const now = new Date()
    const marketing = {
      marketing: 'yes' as const,
      marketingAt: now,
      marketingSource: `подписка с сайта № ${sub.id}`,
    }
    let [lead] = await tx.select().from(leads).where(eq(leads.email, sub.email)).limit(1)
    if (lead) {
      // Язык писем — последний, на котором человек к нам обращался; подписка — тоже обращение
      await tx
        .update(leads)
        .set({ ...marketing, locale: sub.locale, lastEventAt: now })
        .where(eq(leads.id, lead.id))
    } else {
      // Имени подписчик не оставлял — в списке лидов его видно по почте
      ;[lead] = await tx
        .insert(leads)
        .values({
          name: sub.email,
          email: sub.email,
          locale: sub.locale,
          lastEventAt: now,
          ...marketing,
        })
        .returning()
    }
    await tx
      .insert(leadTags)
      .values({ leadId: lead!.id, tag: SUBSCRIBE_TAG, auto: true })
      .onConflictDoUpdate({ target: [leadTags.leadId, leadTags.tag], set: { auto: true } })
    await tx
      .update(subscriptions)
      .set({ confirmedAt: now, leadId: lead!.id })
      .where(eq(subscriptions.id, sub.id))
    return 'confirmed'
  })
}
