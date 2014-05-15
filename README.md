# DSI
> (Do Something Interesting?? / Inovative?? / Impressing?? / ??)  
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

