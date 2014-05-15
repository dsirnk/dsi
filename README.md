# DSI
> (Do Something Inovative?? / Interesting?? / Impressing?? / ??)  
> Basically this is a grunt task boilerplate to instansiate quick custom tasks

## Tasks included:

- emailer (zip and upload)
- screenfly (crawl, screenshot and diff)

### Screenfly

Add a config.json to the root (where your package.json file is) with the following configuration

```json
[
    {
        "name": "websiteName",
        "link": "http://website.url",
        "dir": "path\\to\\website\\dir\\"
    }
]
```

Screenfly will
1. Monitor chages to your css, js, html, cshtml and images files
2. On change will crawl through the links (currently `<a>` tags)
3. Take screenshots of these pages
4. Compare it with base screenshots (current difference threshold is 5% changes) 
5. Prompt you with the pages that have changed, with the diff between the original and new screenshots