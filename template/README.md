# My site

Made with Site Builder. It is a small React site (Vite). All the words, colours, fonts and motion settings live in one file:
**`src/site-data.json`**. Change that file and the site changes.

## Put it online with Vercel (free, no coding)

1. Create a free account at https://github.com and click **New repository**. Give it a name like `my-site` and click **Create repository**.
2. On the new repository page click **uploading an existing file**, then drag in **everything inside this folder** (not the folder itself). Click **Commit changes**.
3. Go to https://vercel.com, sign in with GitHub, click **Add New**, then **Project**, pick your repository and click **Deploy**. Vercel detects Vite automatically.
4. In about a minute you get a link like `my-site.vercel.app`. Every time you edit a file on GitHub, Vercel republishes the site.

Netlify works the same way: **Add new site**, **Import an existing project**, **GitHub**, build command `npm run build`, publish directory `dist`.

## Run it on your computer (optional)

Install Node.js 20 or newer from https://nodejs.org, then in this folder run:

```bash
npm install
npm run dev
```

Open the address it prints (usually http://localhost:5173).

## Add your own photos or files

Put images (and a `resume.pdf` if you have one) in a folder called `public/`, then point to them in `src/site-data.json`, for example `"photoUrl": "/photo.jpg"`, `"imageUrl": "/shop.jpg"` or `"resumeUrl": "/resume.pdf"`.
