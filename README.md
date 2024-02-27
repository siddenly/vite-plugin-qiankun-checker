vite-plugin-checker for qiankun

```
import checker from 'vite-plugin-checker';
import qiankunChecker from '@baidu/vite-plugin-qiankun-checker';

plugins: [
    checker({
        typescript: true,
        overlay: false
    }),
    qiankunChecker()
]
```
