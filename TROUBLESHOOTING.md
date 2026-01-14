# Xatolarni tuzatish

## Products.ts faylida qizil xato

Agar `Products.ts` faylida qizil xato ko'rsatilayotgan bo'lsa va "Cannot find module 'mongoose'" xabari chiqayotgan bo'lsa, quyidagi qadamlarni bajaring:

### 1. Dependencies o'rnatish

```bash
cd backend
npm install
```

### 2. TypeScript server qayta ishga tushirish

VS Code/Cursor da:
- `Ctrl+Shift+P` (yoki `Cmd+Shift+P` Mac da)
- "TypeScript: Restart TS Server" ni tanlang

### 3. Agar hali ham xato bo'lsa

```bash
cd backend
npm install mongoose@latest
```

### 4. Workspace ni qayta yuklash

- VS Code/Cursor ni yopib qayta oching
- Yoki "Developer: Reload Window" buyrug'ini ishlating

### Eslatma

Mongoose 8+ versiyasida TypeScript types o'rnatilgan. Agar xato hali ham ko'rsatilayotgan bo'lsa, bu faqat linter xatosi va kod ishlaydi. Lekin yuqoridagi qadamlarni bajarsangiz, xato yo'qoladi.
