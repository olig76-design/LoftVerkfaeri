# LoftVerkfæri

LoftVerkfæri er einfalt og hraðvirkt íslenskt vefapp fyrir loftræstimenn, verktaka, tæknifræðinga og þjónustumenn sem vinna við loftræstikerfi.

Appið er byggt í hreinu HTML, CSS og JavaScript án bakenda. Verkefni vistast í LocalStorage og appið getur virkað offline eftir fyrstu opnun yfir localhost eða hýsingu sem styður service worker.

## Virkni

- Reikna loftmagn út frá stokkastærð og lofthraða.
- Reikna loftmagn út frá flatarmáli.
- Reikna lofthraða út frá loftmagni og stokkastærð.
- Finna mælta hringstokkastærð og tillögur að ferköntuðum stokkum.
- Áætla þrýstifall í beinum stokkum og íhlutum.
- Umbreyta einingum fyrir loft, hraða, þrýsting og lengdir.
- Vista verkefni og athugasemdir í LocalStorage.
- Prenta eða vista verkefni sem PDF úr vafra.

## Keyrsla locally

Opna beint:

```text
index.html
```

Eða keyra local server:

```powershell
node server.js
```

Opna svo:

```text
http://127.0.0.1:4174/
```

## GitHub Pages

Þetta verkefni er static site og má hýsa beint á GitHub Pages. Veldu `main` branch og root folder sem source.
