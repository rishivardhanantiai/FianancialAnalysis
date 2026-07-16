import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

// Create styles for the PDF
const styles = StyleSheet.create({
  page: { 
    padding: 40, 
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff'
  },
  
  // --- Header Section ---
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start',
    marginBottom: 40,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 20
  },
  logo: { 
    width: 65, 
    height: 65, 
    marginBottom: 10,
    borderRadius: 4 // Optional: slightly rounds the logo corners if it's square
  },
  companyTitle: { fontSize: 20, fontWeight: 'bold', color: '#0f172a', letterSpacing: 0.5, marginBottom: 4 },
  companySubtitle: { fontSize: 10, color: '#64748b', marginBottom: 2 },
  
  invoiceText: { fontSize: 28, color: '#0f172a', fontWeight: 'bold', tracking: 1, marginBottom: 8 },
  invoiceMetaRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 4 },
  invoiceMetaLabel: { fontSize: 10, color: '#64748b', width: 60, textAlign: 'right', marginRight: 8 },
  invoiceMetaValue: { fontSize: 10, color: '#0f172a', fontWeight: 'bold', width: 80, textAlign: 'right' },
  
  // --- Billing Section ---
  section: { marginBottom: 35 },
  label: { fontSize: 9, color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  clientName: { fontSize: 14, fontWeight: 'bold', color: '#0f172a', marginBottom: 4 },
  text: { fontSize: 10, color: '#475569', marginBottom: 3, lineHeight: 1.4 },
  
  // --- Table Styles ---
  table: { width: '100%', marginTop: 10 },
  tableHeader: { 
    flexDirection: 'row', 
    backgroundColor: '#f8fafc',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginBottom: 8 
  },
  tableRow: { 
    flexDirection: 'row', 
    paddingVertical: 10, 
    paddingHorizontal: 8,
    borderBottomWidth: 1, 
    borderBottomColor: '#f1f5f9' 
  },
  colDescription: { width: '50%', fontSize: 10, color: '#334155', lineHeight: 1.4 },
  colQty: { width: '15%', fontSize: 10, color: '#334155', textAlign: 'center' },
  colPrice: { width: '15%', fontSize: 10, color: '#334155', textAlign: 'right' },
  colTotal: { width: '20%', fontSize: 10, color: '#0f172a', textAlign: 'right', fontWeight: 'bold' },
  
  // --- Totals Section ---
  totalsWrapper: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 20 },
  totalsContainer: { width: '40%' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  grandTotalRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    paddingVertical: 10,
    marginTop: 4,
    borderTopWidth: 2, 
    borderTopColor: '#0f172a' 
  },
  totalLabel: { fontSize: 10, color: '#64748b' },
  totalValue: { fontSize: 10, color: '#334155', fontWeight: 'bold' },
  grandTotalLabel: { fontSize: 12, fontWeight: 'bold', color: '#0f172a' },
  grandTotalValue: { fontSize: 14, fontWeight: 'bold', color: '#0f172a' },

  // --- Footer ---
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 40,
    right: 40,
    textAlign: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 20
  },
  footerText: { fontSize: 9, color: '#94a3b8' }
});

export const InvoiceTemplate = ({ invoiceNumber, client, lineItems, totalAmount }: any) => (
  <Document>
    <Page size="A4" style={styles.page}>
      
      {/* HEADER */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          {/* Logo pulled directly from your public folder */}
          <Image style={styles.logo} src="/logo.jpg" />
          <Text style={styles.companyTitle}>ANTI AI</Text>
          <Text style={styles.companySubtitle}>123 Tech Boulevard</Text>
          <Text style={styles.companySubtitle}>Hyderabad, Telangana</Text>
          <Text style={styles.companySubtitle}>billing@antiai.com</Text>
        </View>
        <View style={{ flex: 1, alignItems: 'flex-end' }}>
          <Text style={styles.invoiceText}>INVOICE</Text>
          
          <View style={styles.invoiceMetaRow}>
            <Text style={styles.invoiceMetaLabel}>Invoice No:</Text>
            <Text style={styles.invoiceMetaValue}>{invoiceNumber}</Text>
          </View>
          
          <View style={styles.invoiceMetaRow}>
            <Text style={styles.invoiceMetaLabel}>Issue Date:</Text>
            <Text style={styles.invoiceMetaValue}>{new Date().toLocaleDateString('en-IN')}</Text>
          </View>
        </View>
      </View>

      {/* BILL TO */}
      <View style={styles.section}>
        <Text style={styles.label}>Bill To</Text>
        <Text style={styles.clientName}>{client.name || 'Client Name'}</Text>
        {client.address && <Text style={styles.text}>{client.address}</Text>}
        {client.email && <Text style={styles.text}>{client.email}</Text>}
        {client.tax_id && <Text style={[styles.text, { marginTop: 4, color: '#64748b' }]}>Tax ID: {client.tax_id}</Text>}
      </View>

      {/* TABLE HEADER */}
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={styles.colDescription}>Description</Text>
          <Text style={styles.colQty}>Qty</Text>
          <Text style={styles.colPrice}>Price</Text>
          <Text style={styles.colTotal}>Total</Text>
        </View>

        {/* TABLE ROWS */}
        {lineItems.map((item: any, i: number) => (
          <View key={i} style={styles.tableRow}>
            <Text style={styles.colDescription}>{item.description || '-'}</Text>
            <Text style={styles.colQty}>{item.quantity}</Text>
            <Text style={styles.colPrice}>₹{Number(item.unit_price).toFixed(2)}</Text>
            <Text style={styles.colTotal}>₹{Number(item.subtotal).toFixed(2)}</Text>
          </View>
        ))}
      </View>

      {/* TOTALS */}
      <View style={styles.totalsWrapper}>
        <View style={styles.totalsContainer}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>₹{Number(totalAmount).toFixed(2)}</Text>
          </View>
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Total Due</Text>
            <Text style={styles.grandTotalValue}>₹{Number(totalAmount).toFixed(2)}</Text>
          </View>
        </View>
      </View>

      {/* FOOTER */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Thank you for your business.</Text>
        <Text style={styles.footerText}>ANTI AI Command Center · Confidential</Text>
      </View>

    </Page>
  </Document>
);