import {Element, load, Cheerio} from 'cheerio';

import type {PluginOption} from 'vite';

const plugin: () => PluginOption = () => {
    let isProduction: boolean;
    let base = '';

    // dynamic import module
    const module2DynamicImport = (script$: Cheerio<Element>) => {
        const text = script$.text();

        // 应该根据子应用 base 层级来计算
        // https://github.com/tengmaoqing/vite-plugin-qiankun/issues/57
        const level = base.replace(/^\/|\/$/g, '').split('/').length;
        const rollback = Array.from({length: level}).fill('..').join('/');
        const appendBase = `(window.proxy ? (window.proxy.__INJECTED_PUBLIC_PATH_BY_QIANKUN__ + '${rollback}') : '') + `;
        script$.removeAttr('type');
        script$.html(`
            import(${appendBase}'/@vite-plugin-checker-runtime').then(r => {
                const {inject} = r;
                ${text.slice(text.indexOf(';\n')+1)}
            })
        `);
    };

    return {
        name: 'vite-plugin-qiankun-checker',
        configResolved(config) {
            isProduction = config.command === 'build' || config.isProduction;
            base = config.base;
        },

        configureServer(server) {
            return () => {
                server.middlewares.use((_req, res, next) => {
                    if (isProduction) {
                        next();
                        return;
                    }
                    const end = res.end.bind(res);
                    // eslint-disable-next-line
                    // @ts-ignore
                    res.end = (...args: any[]) => {
                        // eslint-disable-next-line
                        let [htmlStr, ...rest] = args;
                        if (typeof htmlStr === 'string') {
                            const $ = load(htmlStr);
                            const scripts$ = $('script[type="module"]');
                            let theScript$;
                            scripts$.each((_i, ele) => {
                                const ele$ = $(ele);
                                if(ele$.text().includes('@vite-plugin-checker-runtime')) {
                                    theScript$ = ele$;
                                }
                            });
                            if (theScript$) {
                                module2DynamicImport(theScript$);
                            }
                            htmlStr = $.html();
                        }
                        end(htmlStr, ...rest);
                    };
                    next();
                });
            };
        }
    };
};

export default plugin;
