#!/usr/bin/env node
/**
 * Replace placeholder Twenty demo People + Opportunities with AntiTrader trading-school funnel examples.
 * Uses REST only (same patterns as n8n). Re-run is idempotent (same names/fields).
 *
 * Usage (from AntiTrader/):
 *   source .env   # TWENTY_API_KEY, optional TWENTY_SEED_BASE (default http://localhost:3020)
 *   node scripts/seed-antitrader-twenty-demo.mjs
 *
 * For Docker API URL from host: TWENTY_SEED_BASE=http://localhost:3020
 */
const BASE = (process.env.TWENTY_SEED_BASE || process.env.SERVER_URL || 'http://localhost:3020').replace(
  /\/$/,
  '',
)
const TOKEN = process.env.TWENTY_API_KEY || ''
if (!TOKEN) {
  console.error('TWENTY_API_KEY is required (e.g. source AntiTrader/.env)')
  process.exit(1)
}

const auth = { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' }

async function req(method, path, body) {
  const url = `${BASE}${path.startsWith('/') ? '' : '/'}${path}`
  const r = await fetch(url, {
    method,
    headers: method === 'GET' ? { Authorization: `Bearer ${TOKEN}` } : auth,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const text = await r.text()
  let json
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    throw new Error(`${method} ${url} -> ${r.status} non-JSON: ${text.slice(0, 200)}`)
  }
  if (!r.ok) {
    throw new Error(`${method} ${url} -> ${r.status} ${text.slice(0, 500)}`)
  }
  return json
}

/** People: stable ids from current workspace (seed run updates in place). */
const PEOPLE = [
  {
    id: '363a4822-127e-43d4-b457-6e015e19eff6',
    name: { firstName: 'Alex', lastName: 'Morgan' },
    emails: { primaryEmail: 'alex.morgan.demo@antitrader.local', additionalEmails: null },
    jobTitle: 'Funnel | utm_source=meta | utm_campaign=learn-to-trade',
    phones: {
      primaryPhoneNumber: '',
      primaryPhoneCountryCode: '',
      primaryPhoneCallingCode: '',
      additionalPhones: null,
    },
  },
  {
    id: '3e8703ca-03e3-4171-870b-6c7f8089f22e',
    name: { firstName: 'Jordan', lastName: 'Lee' },
    emails: { primaryEmail: 'jordan.lee.demo@antitrader.local', additionalEmails: null },
    jobTitle: 'Qualified | SMS + video sent · awaiting reply',
    phones: {
      primaryPhoneNumber: '',
      primaryPhoneCountryCode: '',
      primaryPhoneCallingCode: '',
      additionalPhones: null,
    },
  },
  {
    id: '76c82774-27be-4be4-b2f3-fc5b65b6a101',
    name: { firstName: 'Sam', lastName: 'Rivera' },
    emails: { primaryEmail: 'sam.rivera.demo@antitrader.local', additionalEmails: null },
    jobTitle: 'Webinar | registered · reminders scheduled',
    phones: {
      primaryPhoneNumber: '+447700900000',
      primaryPhoneCountryCode: 'GB',
      primaryPhoneCallingCode: '+44',
      additionalPhones: null,
    },
  },
  {
    id: 'cb50b295-61aa-4196-83a3-f22c805c8eb8',
    name: { firstName: 'Taylor', lastName: 'Chen' },
    emails: { primaryEmail: 'taylor.chen.demo@antitrader.local', additionalEmails: null },
    jobTitle: 'Discovery call | booked · agenda shared',
    phones: {
      primaryPhoneNumber: '',
      primaryPhoneCountryCode: '',
      primaryPhoneCallingCode: '',
      additionalPhones: null,
    },
  },
  {
    id: 'fcfd89ea-b601-4381-9e46-c2eabd013dd3',
    name: { firstName: 'Riley', lastName: 'Patel' },
    emails: { primaryEmail: 'riley.patel.demo@antitrader.local', additionalEmails: null },
    jobTitle: 'Stripe | checkout.session.completed · school enrollment',
    phones: {
      primaryPhoneNumber: '',
      primaryPhoneCountryCode: '',
      primaryPhoneCallingCode: '',
      additionalPhones: null,
    },
  },
]

/** Opportunities: ids from workspace seed — name + stage match AntiTrader sales workflow. */
const OPPORTUNITIES = [
  {
    id: '9457f8e9-16ae-43b9-92ee-cbd21f3dded5',
    pointOfContactId: '363a4822-127e-43d4-b457-6e015e19eff6',
    name: 'Lead · Funnel (ads → landing + UTM)',
    stage: 'NEW',
    amount: { amountMicros: 0, currencyCode: 'USD' },
  },
  {
    id: '9543adcf-ec03-44e2-9233-3c2d3ebae98a',
    pointOfContactId: '3e8703ca-03e3-4171-870b-6c7f8089f22e',
    name: 'Qualified · outreach + video',
    stage: 'SCREENING',
    amount: { amountMicros: 297_000_000, currencyCode: 'USD' },
  },
  {
    id: '2beb07b0-340c-41d7-be33-5aa91757f329',
    pointOfContactId: '76c82774-27be-4be4-b2f3-fc5b65b6a101',
    name: 'Webinar · invite, show-up, replay',
    stage: 'MEETING',
    amount: { amountMicros: 297_000_000, currencyCode: 'USD' },
  },
  {
    id: '75de302f-1044-4957-8da4-1f67ebefd52b',
    pointOfContactId: 'cb50b295-61aa-4196-83a3-f22c805c8eb8',
    name: 'Discovery call · needs & fit',
    stage: 'PROPOSAL',
    amount: { amountMicros: 997_000_000, currencyCode: 'USD' },
  },
  {
    id: '822639e5-9bf7-40f1-8882-a11140362339',
    pointOfContactId: 'fcfd89ea-b601-4381-9e46-c2eabd013dd3',
    name: 'Enrolled · account + lesson plan access',
    stage: 'CUSTOMER',
    amount: { amountMicros: 2_497_000_000, currencyCode: 'USD' },
  },
  {
    id: 'fc747edc-cb00-4078-8d6b-1fab2611dae4',
    pointOfContactId: null,
    name: 'Active student · sim trades + notifications',
    stage: 'CUSTOMER',
    amount: { amountMicros: 2_497_000_000, currencyCode: 'USD' },
  },
]

const CASEY_EMAIL = 'casey.nguyen.demo@antitrader.local'

async function findPersonIdByEmail(email) {
  const filter = `emails.primaryEmail[eq]:${email}`
  const path = `/rest/people?filter=${encodeURIComponent(filter)}&limit=1`
  const json = await req('GET', path)
  const people = json?.data?.people
  return Array.isArray(people) && people[0]?.id ? people[0].id : null
}

const CLOSE = {
  funnel: '2026-05-01T12:00:00.000Z',
  qualified: '2026-05-08T12:00:00.000Z',
  webinar: '2026-05-15T12:00:00.000Z',
  call: '2026-05-22T12:00:00.000Z',
  enrolled: '2026-06-01T12:00:00.000Z',
  active: '2026-06-15T12:00:00.000Z',
}

async function main() {
  console.log(`Seeding AntiTrader demo data against ${BASE}`)

  for (const p of PEOPLE) {
    const { id, ...body } = p
    await req('PATCH', `/rest/people/${id}`, body)
    console.log('Updated person', id, body.name)
  }

  let caseyId = OPPORTUNITIES[5].pointOfContactId || (await findPersonIdByEmail(CASEY_EMAIL))
  if (!caseyId) {
    const created = await req('POST', '/rest/people', {
      name: { firstName: 'Casey', lastName: 'Nguyen' },
      emails: { primaryEmail: CASEY_EMAIL, additionalEmails: null },
      jobTitle: 'Active student | lesson plan + practice account',
      phones: {
        primaryPhoneNumber: '',
        primaryPhoneCountryCode: '',
        primaryPhoneCallingCode: '',
        additionalPhones: null,
      },
    })
    const newPerson = created?.data?.createPerson || created?.data
    caseyId = newPerson?.id
    if (!caseyId) throw new Error('POST /rest/people did not return id: ' + JSON.stringify(created).slice(0, 400))
    console.log('Created person Casey Nguyen', caseyId)
  } else {
    await req('PATCH', `/rest/people/${caseyId}`, {
      name: { firstName: 'Casey', lastName: 'Nguyen' },
      emails: { primaryEmail: CASEY_EMAIL, additionalEmails: null },
      jobTitle: 'Active student | lesson plan + practice account',
      phones: {
        primaryPhoneNumber: '',
        primaryPhoneCountryCode: '',
        primaryPhoneCallingCode: '',
        additionalPhones: null,
      },
    })
    console.log('Updated person Casey Nguyen', caseyId)
  }
  OPPORTUNITIES[5].pointOfContactId = caseyId

  const closeDates = [
    CLOSE.funnel,
    CLOSE.qualified,
    CLOSE.webinar,
    CLOSE.call,
    CLOSE.enrolled,
    CLOSE.active,
  ]

  for (let i = 0; i < OPPORTUNITIES.length; i++) {
    const o = OPPORTUNITIES[i]
    const { id, ...fields } = o
    const body = {
      name: fields.name,
      stage: fields.stage,
      amount: fields.amount,
      closeDate: closeDates[i],
      pointOfContactId: fields.pointOfContactId,
    }
    await req('PATCH', `/rest/opportunities/${id}`, body)
    console.log('Updated opportunity', id, fields.name, fields.stage)
  }

  console.log('Done. Refresh Twenty (People + Opportunities).')
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})
