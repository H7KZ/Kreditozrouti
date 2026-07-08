<template>
	<div class="not-found">
		<p class="code">404</p>
		<h1>Page not found</h1>
		<p class="desc">This page doesn't exist.</p>
		<div class="links">
			<a href="/docs/en/">Back to docs</a>
			<span class="sep">·</span>
			<a href="https://kreditozrouti.cz">Open the app</a>
		</div>
	</div>
</template>

<style scoped>
.not-found {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	min-height: 60vh;
	gap: 0.5rem;
	text-align: center;
	padding: 2rem;
}

.code {
	font-size: 5rem;
	font-weight: 700;
	color: var(--insis-text-3);
	margin: 0;
	line-height: 1;
}

.not-found h1 {
	font-size: 1.5rem;
	font-weight: 600;
	color: var(--insis-text);
	margin: 0.5rem 0 0;
	border: none;
}

.desc {
	color: var(--insis-text-2);
	margin: 0 0 1rem;
}

.links {
	display: flex;
	align-items: center;
	gap: 0.75rem;
}

.links a {
	color: var(--insis-blue);
	text-decoration: none;
}

.links a:hover {
	color: var(--insis-blue-hover);
	text-decoration: underline;
}

.sep {
	color: var(--insis-text-3);
}
</style>
