import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto'
import { NodeSDK } from '@opentelemetry/sdk-node'

// Tracing is opt-in. The SDK only starts when OTEL_EXPORTER_OTLP_ENDPOINT is set.
// Without a running collector (an Alloy otelcol.receiver.otlp forwarding to Tempo)
// every span export fails and floods the logs with connection errors, so we do not
// export by default. Set OTEL_EXPORTER_OTLP_ENDPOINT once a receiver exists to re-enable.
const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT

if (endpoint) {
	const sdk = new NodeSDK({
		serviceName: 'kreditozrouti-scraper',
		traceExporter: new OTLPTraceExporter({
			url: `${endpoint}/v1/traces`
		}),
		instrumentations: [
			getNodeAutoInstrumentations({
				'@opentelemetry/instrumentation-pino': { enabled: true },
				'@opentelemetry/instrumentation-fs': { enabled: false }
			})
		]
	})

	sdk.start()
}
