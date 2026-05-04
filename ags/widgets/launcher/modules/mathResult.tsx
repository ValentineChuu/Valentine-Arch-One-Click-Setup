export default function MathResult({ expression, result }: {
  expression: any
  result: any
}) {
  return (
    <box cssClasses={["launcher-math"]} spacing={8}>
      <image iconName="accessories-calculator-symbolic" pixelSize={32} />
      <box orientation={1} hexpand>
        <label
          halign={0}
          cssClasses={["launcher-math-expr"]}
          label={expression}
          singleLineMode
        />
        <label
          halign={0}
          cssClasses={["launcher-math-result"]}
          label={result((r: string) => r ? `= ${r}` : "")}
          singleLineMode
        />
      </box>
    </box>
  )
}