# Autenticación – Estado actual y diseño SaaS

## Cómo funciona hoy

### Backend
- **Registro** `POST /auth/register`: email, password, name → bcrypt hash → insert user → JWT 7 días en cookie `accessToken` (httpOnly, secure en prod, sameSite strict).
- **Login** `POST /auth/login`: email + password → bcrypt compare → mismo JWT 7 días en cookie.
- **Sesión** `GET /auth/me`: middleware lee cookie o header `Authorization: Bearer <token>` → verifica JWT → devuelve user.
- **Logout** `POST /auth/logout`: borra cookie `accessToken`.
- **Secreto**: `JWT_SECRET` desde env o fallback `"devsecret"` (inseguro en producción).

### Frontend
- **AuthContext**: al montar hace `GET /auth/me` con `credentials: "include"` y guarda `user` o `null`.
- **Login/Register**: POST con `credentials: "include"`; al éxito `setUser(data.user)` y redirige.
- **Rutas**: `GuestOnly` para `/login`, `/register`; `AuthOnly` para rutas protegidas; raíz muestra Dashboard o Home.

### Limitaciones actuales
- Un solo token largo (7d): si se filtra, da acceso hasta caducar.
- Sin rate limiting: vulnerable a fuerza bruta en login/registro.
- Sin validación estricta: email sin formato, contraseña sin longitud mínima.
- Sin refresh: al caducar el token el usuario debe volver a iniciar sesión.
- `JWT_SECRET` con fallback en dev puede colarse en producción.

---

## Mejoras tipo SaaS (implementadas)

1. **Refresh tokens**
   - Access token: JWT corto (ej. 15 min) en cookie `accessToken`.
   - Refresh token: JWT largo (ej. 7 d) en cookie `refreshToken` (httpOnly, secure, sameSite).
   - `POST /auth/refresh`: lee `refreshToken`, verifica, emite nuevo access + refresh (rotación).
   - Frontend: ante 401 en cualquier petición, llama a `/auth/refresh` una vez; si responde 200, reintenta la petición; si 401, logout y redirige a `/login`.

2. **Seguridad en producción**
   - `JWT_SECRET` y `REFRESH_SECRET` obligatorios en producción (el servidor no arranca si faltan).

3. **Rate limiting**
   - Límite por IP en `/auth/login`, `/auth/register` y `/auth/refresh` (ej. 5–10 req/15 min en login, menos en register) para mitigar fuerza bruta y abuso.

4. **Validación de entrada**
   - Email: formato válido y normalizado (trim, lowercase).
   - Contraseña: longitud mínima (ej. 8 caracteres) en registro y login.

5. **Cookies**
   - `path: "/"`, `sameSite: "strict"` (o `"lax"` si necesitáis cross-subdomain).
   - En producción `secure: true`.

---

## Flujo recomendado a futuro (opcional)

- **Verificación de email**: tras registro, enviar link con token; marcar usuario como verificado al hacer clic.
- **Recuperación de contraseña**: “Olvidé mi contraseña” → token por email → formulario nueva contraseña.
- **Revocación de refresh**: tabla `refresh_tokens` (id, user_id, token_hash, expires_at); en logout o “cerrar todas las sesiones” borrar o marcar como revocados.
- **2FA**: TOTP o correo de código para login.
