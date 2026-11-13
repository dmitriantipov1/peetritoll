// Excel к заявке на банкет и группу (7.1): рабочий документ, а не отчёт. Заказчица дописывает
// в пустые колонки «Предложение заведения» и «Комментарий» и согласует с гостем офлайн.
// Формат строго .xlsx: CSV с кириллицей Excel открывает кракозябрами. Файл не защищаем.
import ExcelJS from 'exceljs'
import type { RequestRow } from '../db/schema'
import {
  banquetOccasionNames,
  requestTypeNames,
  ruFirst,
  type RequestCalcLine,
} from '#shared/requests'
import { fullDate } from '#shared/dates'
import { catalogUnitPer } from '#shared/catalog'
import { slugify } from '#shared/slug'

const EURO = '#,##0.00 "€"'

/** «banket-1042-koit.xlsx» — вид, номер, фамилия латиницей */
export function requestExcelName(row: RequestRow): string {
  const kind = row.type === 'group' ? 'gruppa' : 'banket'
  const last = slugify(row.name.trim().split(/\s+/).at(-1) ?? '') || 'gost'
  return `${kind}-${row.id}-${last}.xlsx`
}

export async function requestExcel(row: RequestRow): Promise<Buffer> {
  const book = new ExcelJS.Workbook()
  book.creator = 'Peetri Toll'
  book.created = new Date()
  const sheet = book.addWorksheet('Расчёт', { views: [{ state: 'frozen', ySplit: 0 }] })
  sheet.columns = [
    { width: 22 },
    { width: 40 },
    { width: 16 },
    { width: 10 },
    { width: 14 },
    { width: 30 },
    { width: 30 },
  ]

  const title = sheet.addRow([`${requestTypeNames[row.type]} № ${row.id}`])
  title.font = { bold: true, size: 14 }
  const d = row.details
  const info: [string, string | number][] = [
    ['Гость', row.name],
    ['Телефон', row.phone],
    ['E-mail', row.email ?? ''],
    // У группы дата и время необязательны — согласуют позже
    ['Дата', row.visitDate ? fullDate(row.visitDate) : 'не указана'],
    ['Время', row.visitTime ?? 'не указано'],
    ['Гостей', row.guests ?? ''],
  ]
  if (d.type === 'banquet' && d.occasion) info.push(['Повод', banquetOccasionNames[d.occasion]])
  if (d.type === 'group' && d.agency) info.push(['Группа или агентство', d.agency])
  if (d.type === 'group' && d.menuId === null) info.push(['Обед', 'не выбрали — обсудить'])
  if (row.comment) info.push(['Комментарий гостя', row.comment])
  for (const [label, value] of info) {
    const r = sheet.addRow([label, value])
    r.getCell(1).font = { bold: true }
  }
  sheet.addRow([])

  // Обед группы — одна строка «Меню № 3 · Путевое · цена с человека × человек»
  const groupMenu = row.calc?.lines.some((l) => l.ref.kind === 'groupMenu') ?? false
  const head = sheet.addRow([
    groupMenu ? 'Меню' : 'Категория',
    groupMenu ? 'Обед' : 'Блюдо',
    groupMenu ? 'С человека' : 'Цена за единицу',
    groupMenu ? 'Человек' : 'Количество',
    'Сумма',
    'Предложение заведения',
    'Комментарий',
  ])
  head.font = { bold: true }
  head.eachCell((c) => {
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE4DAC9' } }
    c.border = { bottom: { style: 'thin' } }
  })

  const lines: RequestCalcLine[] = row.calc?.lines ?? []
  const first = sheet.rowCount + 1
  for (const l of lines) {
    // Единица — к названию: в колонке количества число, его считает формула суммы
    const unit = l.unit && l.unit !== 'portion' ? ` (за ${catalogUnitPer[l.unit].ru})` : ''
    const r = sheet.addRow([
      ruFirst(l.category),
      ruFirst(l.names) + unit,
      l.priceCents / 100,
      l.qty,
    ])
    // Сумма — формулой: заказчица меняет порции, сумма пересчитывается сама
    r.getCell(5).value = {
      formula: `C${r.number}*D${r.number}`,
      result: (l.priceCents * l.qty) / 100,
    }
    r.getCell(3).numFmt = EURO
    r.getCell(5).numFmt = EURO
  }
  const last = sheet.rowCount
  const total = sheet.addRow(['', 'Ориентировочно'])
  total.font = { bold: true }
  total.getCell(5).value = {
    formula: lines.length ? `SUM(E${first}:E${last})` : '0',
    result: (row.calc?.totalCents ?? 0) / 100,
  }
  total.getCell(5).numFmt = EURO

  sheet.addRow([])
  const priced = row.calc ? new Date(row.calc.pricedAt) : row.createdAt
  sheet.addRow([
    `Цены — на момент отправки заявки, ${fullDate(priced.toISOString().slice(0, 10))}. ` +
      'Предварительный расчёт, не является офертой.',
  ]).font = { italic: true }

  return Buffer.from(await book.xlsx.writeBuffer())
}
