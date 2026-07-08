import DefaultTheme from 'vitepress/theme'
import Layout from './Layout.vue'
import NotFound from './NotFound.vue'
import './style.css'

export default {
	extends: DefaultTheme,
	Layout,
	NotFound
}
