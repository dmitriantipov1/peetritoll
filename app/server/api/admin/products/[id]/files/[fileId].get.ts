// Скачать файл цифрового варианта из админки — проверить, что загружено то, что нужно
export default defineEventHandler(async (event) => {
  await requireAccess(event, 'products', 'view')
  return await sendProductFile(event, idParam(event), fileIdParam(event))
})
