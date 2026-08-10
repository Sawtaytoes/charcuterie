# PR assets — feat/adaptive-columns

Before/after screenshots for the `AdaptiveGrid` PR, kept on an orphan branch so the
images in the PR body survive the session that captured them (a `devshare` URL does
not, and GitHub has no REST route for issue attachments).

Nine identical bay cards, `itemBlockSize: 150`, `chromeBlockSize: 208`, daylight variant.

| Viewport | Before | After |
| --- | --- | --- |
| 1280x800 | 1 column, scrolls | **3 columns**, fits |
| 1920x1080 | 1 column, scrolls | **2 columns**, fits |
| 3440x1440 | 1 column, scrolls | **2 columns**, fits |

The smallest viewport takes the most columns. That is the height-first rule working:
the taller windows stack the same nine cards in fewer stacks, so they need fewer.

Not referenced by any build. Safe to delete once the PR is merged.
