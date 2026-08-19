// apps/api/src/core/test-connection.js
import { prisma } from './prisma.js';

async function main() {
  console.log('⏳ Đang kết nối database...');
  await prisma.$connect();
  console.log('✅ Kết nối thành công');

  // Query đơn giản để chắc chắn schema/migration khớp với Client
  // Đổi `user` thành 1 model bất kỳ trong 9 bảng của bạn
  const count = await prisma.user.count();
  console.log(`✅ Query OK — bảng "user" hiện có ${count} dòng`);

  // Optional: liệt kê nhanh tên các model Client nhận diện được
  const models = Object.keys(prisma).filter(
    (k) => !k.startsWith('_') && !k.startsWith('$')
  );
  console.log('📋 Models Client generate ra:', models);
}

main()
  .catch((err) => {
    console.error('❌ Lỗi:', err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });