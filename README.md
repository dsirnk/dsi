# DSI
> Basically this is a grunt task boilerplate to instansiate quick custom tasks

## Tasks included:

- emailer _(zip and upload)_
- screening _(crawl, screenshot and diff)_

### Screening
> Crawl a website(s) _[uses `custom list of links` if provided]_
> Simulate events _(e.g. wait, scrolly, hover, focus, click, addclass)_
> Take screenshots _(on different `viewports`, if defined [each `viewport` can have its own `custom list of links` to crawl through])_
> Generate image diffs highlighting changes _(if `base` version available else will generate `base` version)_

Add a config.json to the root (where your package.json file is) with the following configuration

```json
{
    "debug"    : false,
    "verbose"  : false,
    "viewport" : {
        "default"    : 1024,
        "desktop"    : 1280,
        "mobile"     : 320
    },
    "websites" : {
        "auto-crawl-and-use-default-viewport" : {
            "url"    : "http://localhost"
        },
        "pkgs-with-custom-viewport" : {
            "url"    : "http://localhost:8001",
            "dir"    : "path\\to\\website\\dir\\ OR /path/to/websites/dir/",
            "pkgs"   : {
                "desktop" : {
                    "viewport" : 1003
                },
                "tablet"  : {
                    "viewport" : 768
                }
            },
            "links"  : {
                "001a"    :"/?hover=a.color1",
                "003"     : "/about"
            }
        },
        "pkgs-use-default-viewports-and-same-set-of-links" : {
            "url"    : "http://localhost:8002",
            "dir"    : "path\\to\\website\\dir\\ OR /path/to/websites/dir/",
            "pkgs"   : {
                "desktop" : {},
                "tablet"  : {}
            },
            "links"  : {
                "001a"    :"/?hover=a.color1",
                "003"     : "/about"
            }
        },
        "pkgs-use-default-viewports-and-individual-set-of-links" : {
            "url"    : "http://localhost:8003",
            "pkgs"   : {
                "desktop" : {
                    "links" : {
                        "001"  : "/",
                        "001a" : "/?addClass=.callout|hover",
                        "001b" : "/?addClass=.widget|hover",
                        "003"  : "/about"
                    }
                },
                "mobile"  : {
                    "links" : {
                        "100a" : "/",
                        "103"  : "/about"
                    }
                }
            }
        },
        "ignored-site" : {
            "ignore" : true,
            "url"    : "http://localhost"
        }
    }
}
```

Screening insight:
1. Monitor chages to your css, js, html, cshtml and images files
2. On change will crawl through the `links <a>` or `custom list of links` if provided)
3. Take screenshots of these pages
4. Compare it with `base` screenshots (current difference threshold is 5% changes)
5. Prompt you with the pages that have changed, with the diff between the original and new screenshots