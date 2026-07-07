# Plantilla de recuperacion de contrasena 4DMK

Esta carpeta guarda el diseno HTML del correo de recuperacion de contrasena.

## Donde pegarlo en Supabase

1. Entra a Supabase.
2. Abre el proyecto de 4DMK.
3. Ve a `Authentication`.
4. Entra a `Email Templates`.
5. Abre `Reset Password`.
6. En `Subject`, usa:
   `Recupera tu acceso a 4DMK`
7. En el cuerpo HTML, pega el contenido de:
   `supabase/email-templates/recovery-4dmk.html`

## URL que debe estar permitida

En `Authentication > URL Configuration`, usa esta URL como `Site URL`:

`https://4dmkoficialx.netlify.app`

Y agrega esta URL en los redirects permitidos:

`https://4dmkoficialx.netlify.app/actualizar-contrasena.html`

Sin esa configuracion, Supabase puede enviar el correo, pero el enlace podria no volver correctamente a 4DMK.
