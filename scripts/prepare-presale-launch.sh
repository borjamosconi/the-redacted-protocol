#!/bin/bash
# ═══════════════════════════════════════════════════════════════
#  Redacted Protocol: Preparación para Lanzamiento de Preventa
#  Este script automatiza los pasos técnicos finales.
# ═══════════════════════════════════════════════════════════════

set -e

echo "🔴 Preparando lanzamiento de preventa RDX..."

# 1. Compilar contrato con los últimos cambios autónomos
echo "🔨 Compilando contrato Anchor..."
cd contracts
anchor build

# 2. Extraer IDL para el Dashboard
echo "📂 Sincronizando IDL con el Frontend..."
mkdir -p ../dashboard/src/idl
cp target/idl/rd_presale.json ../dashboard/src/idl/

# 3. Instrucciones de despliegue
echo ""
echo "🚀 LISTO PARA DESPLEGAR. Pasos finales:"
echo "--------------------------------------------------------"
echo "1. Desplegar contrato:"
echo "   anchor deploy --provider.cluster mainnet --program-name rd-presale"
echo ""
echo "2. Crear el Token RDX (si no existe):"
echo "   spl-token create-token --decimals 9"
echo ""
echo "3. Inicializar la preventa (Llamar a la instrucción initialize):"
echo "   (Usa el script de inicialización o llama desde el panel de admin)"
echo ""
echo "4. Fondear el vault:"
echo "   Envía los tokens RDX a la dirección del vault del programa"
echo "   para que los usuarios puedan hacer 'claim' después."
echo "--------------------------------------------------------"
echo "✅ IDL actualizado en dashboard/src/idl/rd_presale.json"
