import React, { useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView,
    TouchableOpacity, ActivityIndicator, Alert, Modal, Pressable
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { DppUploadResponse, EncryptedFileInfo } from '../types';
import { generatePassport, getEncryptedFileInfo } from '../services/dppService';

const COLORS = {
    primary: '#007AFF',
    bg: '#F2F2F7',
    white: '#FFFFFF',
    text: '#1C1C1E',
    sub: '#636366',
    border: '#E5E5EA',
    green: '#34C759',
    red: '#FF3B30',
    purple: '#5856D6',
    orange: '#FF9500',
};

export default function ClassificationResultScreen() {
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const result: DppUploadResponse = route.params?.result;
    const isInvoice: boolean = route.params?.isInvoice ?? false;
    const isQir: boolean = route.params?.isQir ?? false;
    const [generating, setGenerating] = useState(false);
    const [showEncryptModal, setShowEncryptModal] = useState(false);
    const [encryptedInfo, setEncryptedInfo] = useState<EncryptedFileInfo | null>(null);
    const [loadingInfo, setLoadingInfo] = useState(false);

    if (!result) return (
        <View style={styles.fallback}>
            <Ionicons name="alert-circle-outline" size={48} color={COLORS.red} />
            <Text style={styles.fallbackText}>No result available</Text>
        </View>
    );

    const { classification, dppId, fields, fieldsExtracted, supportedFormats, documentEncrypted } = result;
    const isConfidential = classification.classification === 'CONFIDENTIAL';
    const themeColor = isConfidential ? COLORS.red : COLORS.green;

    // Pipeline step A is already complete — user is now at the review gate before Step B
    const confidentialFields = fields.filter(f => f.isConfidential);
    const publicFields = fields.filter(f => !f.isConfidential);
    const geminiCount   = classification.geminiExtractedCount ?? fieldsExtracted;
    const pubCount      = classification.publicFieldCount     ?? publicFields.length;
    const encCount      = classification.confidentialFieldCount ?? confidentialFields.length;

    const handleGeneratePassport = async () => {
        setGenerating(true);
        try {
            const passport = await generatePassport(dppId);
            navigation.navigate('DppPassport', { passport, dppId });
        } catch (err: any) {
            Alert.alert(
                'Passport Error',
                err.response?.data?.error || 'Failed to generate Digital Product Passport.'
            );
        } finally {
            setGenerating(false);
        }
    };

    const handleInvoiceDone = () => {
        if (documentEncrypted) {
            setEncryptedInfo(null);
            setShowEncryptModal(true);
        } else {
            navigation.goBack();
        }
    };

    const handleFetchFileInfo = async () => {
        if (loadingInfo) return;
        setLoadingInfo(true);
        try {
            const info = await getEncryptedFileInfo(dppId);
            setEncryptedInfo(info);
        } catch {
            Alert.alert('Error', 'Could not load encrypted file details.');
        } finally {
            setLoadingInfo(false);
        }
    };

    return (
        <>
        {/* ── Encryption Success Modal ── */}
        <Modal
            visible={showEncryptModal}
            transparent
            animationType="slide"
            onRequestClose={() => setShowEncryptModal(false)}
        >
            <Pressable style={modal.overlay} onPress={() => setShowEncryptModal(false)}>
                <Pressable style={modal.sheet} onPress={e => e.stopPropagation()}>
                    {/* Header */}
                    <View style={modal.header}>
                        <View style={modal.iconRing}>
                            <Ionicons name="shield-checkmark" size={32} color="#fff" />
                        </View>
                        <Text style={modal.title}>File Encrypted &amp; Saved</Text>
                        <Text style={modal.subtitle}>Your document is protected end-to-end</Text>
                    </View>

                    {/* How encryption works */}
                    <View style={modal.section}>
                        <Text style={modal.sectionLabel}>HOW IT WORKS</Text>
                        <View style={modal.infoRow}>
                            <Ionicons name="key-outline" size={16} color={COLORS.purple} />
                            <Text style={modal.infoText}>
                                <Text style={modal.infoBold}>Algorithm: </Text>AES-256-CBC
                            </Text>
                        </View>
                        <View style={modal.infoRow}>
                            <Ionicons name="shuffle-outline" size={16} color={COLORS.purple} />
                            <Text style={modal.infoText}>
                                <Text style={modal.infoBold}>IV: </Text>16-byte CSPRNG, unique per upload — prepended to the file
                            </Text>
                        </View>
                        <View style={modal.infoRow}>
                            <Ionicons name="server-outline" size={16} color={COLORS.purple} />
                            <Text style={modal.infoText}>
                                <Text style={modal.infoBold}>Key: </Text>Resolved from env-var → appsettings → dev-fallback
                            </Text>
                        </View>
                        <View style={modal.infoRow}>
                            <Ionicons name="lock-closed-outline" size={16} color={COLORS.red} />
                            <Text style={modal.infoText}>
                                <Text style={modal.infoBold}>Plaintext deleted: </Text>The original file was permanently removed
                            </Text>
                        </View>
                        <View style={modal.infoRow}>
                            <Ionicons name="person-outline" size={16} color={COLORS.sub} />
                            <Text style={modal.infoText}>
                                <Text style={modal.infoBold}>Decrypt access: </Text>Exporter &amp; Admin only
                            </Text>
                        </View>
                    </View>

                    {/* Stats */}
                    <View style={modal.statsRow}>
                        <View style={modal.statChip}>
                            <Ionicons name="lock-closed" size={14} color={COLORS.red} />
                            <Text style={[modal.statChipText, { color: COLORS.red }]}>{encCount} encrypted fields</Text>
                        </View>
                        <View style={[modal.statChip, { backgroundColor: '#E5FFE5' }]}>
                            <Ionicons name="save-outline" size={14} color={COLORS.green} />
                            <Text style={[modal.statChipText, { color: COLORS.green }]}>Saved → DppDocuments</Text>
                        </View>
                    </View>

                    {/* DPP ID */}
                    <View style={modal.idRow}>
                        <Ionicons name="finger-print-outline" size={14} color={COLORS.purple} />
                        <Text style={modal.idLabel}>DPP ID: </Text>
                        <Text style={modal.idValue} numberOfLines={1}>{dppId}</Text>
                    </View>

                    {/* View encrypted file details */}
                    {!encryptedInfo ? (
                        <TouchableOpacity style={modal.detailsBtn} onPress={handleFetchFileInfo} disabled={loadingInfo}>
                            {loadingInfo
                                ? <ActivityIndicator size="small" color={COLORS.purple} />
                                : <Ionicons name="information-circle-outline" size={18} color={COLORS.purple} />}
                            <Text style={modal.detailsBtnText}>
                                {loadingInfo ? 'Loading…' : 'View Encrypted File Details'}
                            </Text>
                        </TouchableOpacity>
                    ) : (
                        <View style={modal.fileInfoBox}>
                            <Text style={modal.fileInfoHeader}>📁 Encrypted File Details</Text>
                            <View style={modal.fileInfoRow}>
                                <Text style={modal.fileInfoKey}>File Name</Text>
                                <Text style={modal.fileInfoVal} numberOfLines={1}>{encryptedInfo.encryptedFileName}</Text>
                            </View>
                            <View style={modal.fileInfoRow}>
                                <Text style={modal.fileInfoKey}>Original</Text>
                                <Text style={modal.fileInfoVal} numberOfLines={1}>{encryptedInfo.originalFileName}</Text>
                            </View>
                            <View style={modal.fileInfoRow}>
                                <Text style={modal.fileInfoKey}>Size</Text>
                                <Text style={modal.fileInfoVal}>
                                    {encryptedInfo.encryptedSizeBytes
                                        ? `${(encryptedInfo.encryptedSizeBytes / 1024).toFixed(1)} KB (encrypted)`
                                        : 'Unknown'}
                                </Text>
                            </View>
                            <View style={modal.fileInfoRow}>
                                <Text style={modal.fileInfoKey}>Algorithm</Text>
                                <Text style={modal.fileInfoVal}>{encryptedInfo.algorithm}</Text>
                            </View>
                            <View style={modal.fileInfoRow}>
                                <Text style={modal.fileInfoKey}>IV</Text>
                                <Text style={modal.fileInfoVal}>{encryptedInfo.ivDescription}</Text>
                            </View>
                            <View style={modal.fileInfoRow}>
                                <Text style={modal.fileInfoKey}>Collection</Text>
                                <Text style={modal.fileInfoVal}>{encryptedInfo.collection}</Text>
                            </View>
                            <View style={[modal.fileInfoRow, { borderBottomWidth: 0 }]}>
                                <Text style={modal.fileInfoKey}>Decrypt Access</Text>
                                <Text style={[modal.fileInfoVal, { color: COLORS.red }]}>{encryptedInfo.decryptAccess}</Text>
                            </View>
                        </View>
                    )}

                    {/* Done button */}
                    <TouchableOpacity
                        style={modal.doneBtn}
                        onPress={() => { setShowEncryptModal(false); navigation.goBack(); }}
                    >
                        <Ionicons name="checkmark-circle" size={20} color="#fff" />
                        <Text style={modal.doneBtnText}>OK, Done</Text>
                    </TouchableOpacity>
                </Pressable>
            </Pressable>
        </Modal>

        <ScrollView style={styles.container} contentContainerStyle={styles.inner}>
            {/* ── Pipeline Progress ── */}
            {!isInvoice && !isQir && (
                <View style={styles.pipelineBar}>
                    <View style={styles.pipelineStep}>
                        <View style={[styles.stepDot, styles.stepDone]}>
                            <Ionicons name="checkmark" size={14} color="white" />
                        </View>
                        <Text style={styles.stepLabelDone}>Step A Complete</Text>
                        <Text style={styles.stepSubDone}>Extracted · Classified · Encrypted</Text>
                    </View>
                    <View style={styles.pipelineConnector} />
                    <View style={styles.pipelineStep}>
                        <View style={[styles.stepDot, styles.stepPending]}>
                            <Text style={styles.stepDotTextPending}>B</Text>
                        </View>
                        <Text style={styles.stepLabelPending}>Step B — Awaiting Your Approval</Text>
                        <Text style={styles.stepSubPending}>Review below, then approve</Text>
                    </View>
                </View>
            )}
            {isQir && (
                <View style={styles.pipelineBar}>
                    <View style={styles.pipelineStep}>
                        <View style={[styles.stepDot, styles.stepDone]}>
                            <Ionicons name="checkmark" size={14} color="white" />
                        </View>
                        <Text style={styles.stepLabelDone}>QIR Processed</Text>
                        <Text style={styles.stepSubDone}>Extracted · Classified · Encrypted</Text>
                    </View>
                </View>
            )}
            {isInvoice && (
                <View style={styles.pipelineBar}>
                    <View style={styles.pipelineStep}>
                        <View style={[styles.stepDot, styles.stepDone]}>
                            <Ionicons name="checkmark" size={14} color="white" />
                        </View>
                        <Text style={styles.stepLabelDone}>Invoice Processed</Text>
                        <Text style={styles.stepSubDone}>Extracted · Classified · Encrypted</Text>
                    </View>
                </View>
            )}

            {/* ── Encrypted Document Saved Banner ── */}
            {documentEncrypted && (
                <View style={styles.encryptedSavedBanner}>
                    <View style={styles.encryptedSavedIconRow}>
                        <Ionicons name="shield-checkmark" size={22} color="#fff" />
                        <Text style={styles.encryptedSavedTitle}>Encrypted Document Saved to DB</Text>
                    </View>
                    <Text style={styles.encryptedSavedBody}>
                        Majority of fields were confidential. The original file was AES-256-CBC encrypted and stored
                        in the <Text style={{ fontWeight: '800' }}>DppDocuments</Text> collection.
                        The plaintext file was permanently deleted from the server.
                    </Text>
                    <View style={styles.encryptedSavedRow}>
                        <View style={styles.encryptedSavedChip}>
                            <Ionicons name="lock-closed" size={12} color={COLORS.red} />
                            <Text style={styles.encryptedSavedChipText}>.enc file in SecureDocuments/</Text>
                        </View>
                        <View style={[styles.encryptedSavedChip, { backgroundColor: '#E5FFE5' }]}>
                            <Ionicons name="checkmark-circle" size={12} color={COLORS.green} />
                            <Text style={[styles.encryptedSavedChipText, { color: COLORS.green }]}>Saved → DppDocuments</Text>
                        </View>
                    </View>
                </View>
            )}

            {/* Status Header */}
            <View style={[styles.header, { backgroundColor: themeColor }]}>
                <View style={styles.headerIconRing}>
                    <Ionicons
                        name={isConfidential ? 'lock-closed' : 'lock-open'}
                        size={40}
                        color={themeColor}
                    />
                </View>
                <Text style={styles.statusTitle}>
                    {isConfidential ? 'CONFIDENTIAL' : 'NON-CONFIDENTIAL'}
                </Text>
                <Text style={styles.statusSubtitle}>
                    {fieldsExtracted} fields extracted · {confidentialFields.length} encrypted
                </Text>
            </View>

            {/* ── Gemini AI OCR Extraction ── */}
            <View style={styles.card}>
                <View style={styles.sectionHeaderRow}>
                    <Ionicons name="sparkles" size={16} color="#FF9F0A" />
                    <Text style={[styles.cardLabel, { color: '#FF9F0A', marginBottom: 0 }]}>OCR · Extracted Content</Text>
                </View>

                {/* Stats row */}
                <View style={styles.statRow}>
                    <View style={[styles.statBox, { backgroundColor: '#FFF9EE' }]}>
                        <Text style={[styles.statNum, { color: '#FF9F0A' }]}>{geminiCount}</Text>
                        <Text style={styles.statLbl}>Total Fields</Text>
                    </View>
                    <View style={[styles.statBox, { backgroundColor: '#F0FFF4' }]}>
                        <Text style={[styles.statNum, { color: COLORS.green }]}>{pubCount}</Text>
                        <Text style={styles.statLbl}>Public</Text>
                    </View>
                    <View style={[styles.statBox, { backgroundColor: '#FFF0F0' }]}>
                        <Text style={[styles.statNum, { color: COLORS.red }]}>{encCount}</Text>
                        <Text style={styles.statLbl}>Encrypted</Text>
                    </View>
                </View>

                {/* ── Side-by-Side Comparison Table ── */}
                {/* Header row */}
                <View style={sbTable.headerRow}>
                    <Text style={[sbTable.col1, sbTable.hd]}>FIELD</Text>
                    <Text style={[sbTable.col2, sbTable.hd]}>EXTRACTED VALUE</Text>
                    <Text style={[sbTable.col3, sbTable.hd]}>OUTCOME</Text>
                </View>

                {fields.map((f, i) => (
                    <View
                        key={i}
                        style={[
                            sbTable.row,
                            { backgroundColor: f.isConfidential ? '#FFF8F8' : '#F8FFF8' },
                            i < fields.length - 1 && sbTable.rowBorder,
                        ]}
                    >
                        {/* Col 1 — Field name */}
                        <View style={sbTable.col1}>
                            <Ionicons
                                name={f.isConfidential ? 'lock-closed' : 'checkmark-circle'}
                                size={12}
                                color={f.isConfidential ? COLORS.red : COLORS.green}
                                style={{ marginBottom: 3 }}
                            />
                            <Text style={sbTable.fieldTxt} numberOfLines={2}>
                                {f.fieldName}
                            </Text>
                        </View>

                        {/* Col 2 — Extracted value or hidden badge */}
                        <View style={sbTable.col2}>
                            {f.isConfidential ? (
                                <View style={sbTable.hiddenBadge}>
                                    <Ionicons name="eye-off-outline" size={11} color={COLORS.red} />
                                    <Text style={sbTable.hiddenTxt}>Hidden</Text>
                                </View>
                            ) : (
                                <Text style={sbTable.valTxt} numberOfLines={3}>
                                    {f.extractedValue?.trim() || '—'}
                                </Text>
                            )}
                            <Text style={sbTable.confTxt}>
                                {(f.confidenceScore * 100).toFixed(0)}% conf.
                            </Text>
                        </View>

                        {/* Col 3 — Passport destination */}
                        <View style={sbTable.col3}>
                            {f.isConfidential ? (
                                <View style={[sbTable.outcomeBadge, { backgroundColor: '#FFE5E5', borderColor: COLORS.red }]}>
                                    <Ionicons name="lock-closed" size={10} color={COLORS.red} />
                                    <Text style={[sbTable.outcomeTxt, { color: COLORS.red }]}>
                                        {'AES-256\nVault'}
                                    </Text>
                                </View>
                            ) : (
                                <View style={[sbTable.outcomeBadge, { backgroundColor: '#E5FFE5', borderColor: COLORS.green }]}>
                                    <Ionicons name="document-text-outline" size={10} color={COLORS.green} />
                                    <Text style={[sbTable.outcomeTxt, { color: COLORS.green }]}>
                                        {'→ Passport'}
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>
                ))}
            </View>

            {/* ── Supported File Formats ── */}
            <View style={[styles.card, styles.formatsCard]}>
                <View style={styles.sectionHeaderRow}>
                    <Ionicons name="document-attach-outline" size={16} color={COLORS.purple} />
                    <Text style={[styles.cardLabel, { color: COLORS.purple, marginBottom: 0 }]}>Supported Formats</Text>
                </View>
                <View style={styles.formatsRow}>
                    {(supportedFormats ?? ['JPEG', 'PNG', 'WEBP', 'GIF', 'PDF']).map((fmt, i) => {
                        const label = fmt.includes('/') ? fmt.split('/')[1].toUpperCase() : fmt.toUpperCase();
                        const isPdf = label === 'PDF';
                        return (
                            <View key={i} style={[styles.formatChip, { borderColor: isPdf ? COLORS.orange : COLORS.purple }]}>
                                <Ionicons
                                    name={isPdf ? 'document-outline' : 'image-outline'}
                                    size={12}
                                    color={isPdf ? COLORS.orange : COLORS.purple}
                                />
                                <Text style={[styles.formatChipText, { color: isPdf ? COLORS.orange : COLORS.purple }]}>
                                    {label}
                                </Text>
                            </View>
                        );
                    })}
                </View>
            </View>

            {/* ── ONNX Model Classification ── */}
            {/* System Action */}
            <View style={styles.card}>
                <View style={styles.sectionHeaderRow}>
                    <Ionicons name="hardware-chip-outline" size={14} color={COLORS.purple} />
                    <Text style={[styles.cardLabel, { color: COLORS.purple, marginBottom: 0 }]}>ONNX Model · System Action</Text>
                </View>
                <View style={styles.actionRow}>
                    <Ionicons
                        name={isConfidential ? 'shield-checkmark' : 'eye-outline'}
                        size={22}
                        color={themeColor}
                    />
                    <Text style={[styles.actionText, { color: themeColor }]}>
                        {classification.systemAction}
                    </Text>
                </View>
            </View>

            {/* Confidence */}
            <View style={styles.card}>
                <View style={styles.rowBetween}>
                    <Text style={styles.cardLabel}>ONNX Model · Confidence Score</Text>
                    <Text style={[styles.confidenceValue, { color: themeColor }]}>
                        {(classification.confidenceScore * 100).toFixed(1)}% · {classification.confidenceLevel}
                    </Text>
                </View>
                <View style={styles.progressBg}>
                    <View style={[
                        styles.progressFill,
                        { width: `${classification.confidenceScore * 100}%` as any, backgroundColor: themeColor }
                    ]} />
                </View>
            </View>

            {/* Explanation */}
            <View style={styles.card}>
                <Text style={styles.cardLabel}>AI Explanation</Text>
                <Text style={styles.explanationText}>{classification.explanation}</Text>
                {classification.influentialKeywords.length > 0 && (
                    <>
                        <Text style={[styles.cardLabel, { marginTop: 16 }]}>Influential Keywords</Text>
                        <View style={styles.keywordRow}>
                            {classification.influentialKeywords.map((kw, i) => (
                                <View key={i} style={[styles.keyword, { borderColor: themeColor }]}>
                                    <Text style={[styles.keywordText, { color: themeColor }]}>{kw}</Text>
                                </View>
                            ))}
                        </View>
                    </>
                )}
            </View>

            {/* Field breakdown */}
            <View style={styles.card}>
                <Text style={styles.cardLabel}>Field Classification</Text>

                {confidentialFields.length > 0 && (
                    <View style={styles.fieldGroup}>
                        <View style={[styles.fieldGroupHeader, { backgroundColor: '#FFF0F0' }]}>
                            <Ionicons name="lock-closed" size={14} color={COLORS.red} />
                            <Text style={[styles.fieldGroupTitle, { color: COLORS.red }]}>
                                Encrypted Fields ({confidentialFields.length})
                            </Text>
                        </View>
                        {confidentialFields.map((f, i) => (
                            <View key={i} style={styles.fieldRow}>
                                <Ionicons name="key-outline" size={14} color={COLORS.red} />
                                <Text style={styles.fieldName}>{f.fieldName}</Text>
                                <View style={[styles.fieldTag, { backgroundColor: '#FFE5E5' }]}>
                                    <Text style={[styles.fieldTagText, { color: COLORS.red }]}>
                                        {(f.confidenceScore * 100).toFixed(0)}%
                                    </Text>
                                </View>
                            </View>
                        ))}
                    </View>
                )}

                {publicFields.length > 0 && (
                    <View style={styles.fieldGroup}>
                        <View style={[styles.fieldGroupHeader, { backgroundColor: '#F0FFF4' }]}>
                            <Ionicons name="eye-outline" size={14} color={COLORS.green} />
                            <Text style={[styles.fieldGroupTitle, { color: COLORS.green }]}>
                                Public Fields ({publicFields.length})
                            </Text>
                        </View>
                        {publicFields.map((f, i) => (
                            <View key={i} style={[styles.fieldRow, { alignItems: 'flex-start' }]}>
                                <Ionicons name="checkmark-circle-outline" size={14} color={COLORS.green} style={{ marginTop: 3 }} />
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.fieldName}>{f.fieldName}</Text>
                                    {f.extractedValue ? (
                                        <Text style={styles.fieldExtractedVal} numberOfLines={2}>
                                            {f.extractedValue}
                                        </Text>
                                    ) : null}
                                </View>
                                <View style={[styles.fieldTag, { backgroundColor: '#E5FFE5' }]}>
                                    <Text style={[styles.fieldTagText, { color: COLORS.green }]}>Public</Text>
                                </View>
                            </View>
                        ))}
                    </View>
                )}
            </View>

            {/* DPP ID */}
            <View style={styles.idCard}>
                <Ionicons name="finger-print-outline" size={18} color={COLORS.purple} />
                <Text style={styles.idLabel}>DPP ID</Text>
                <Text style={styles.idValue} numberOfLines={1}>{dppId}</Text>
            </View>

            {/* ── Glass Box Review Panel (DPP only) ── */}
            {!isInvoice && !isQir && (
                <View style={styles.reviewPanel}>
                    <View style={styles.reviewPanelHeader}>
                        <Ionicons name="eye" size={18} color={COLORS.purple} />
                        <Text style={styles.reviewPanelTitle}>Glass Box Review — Step B</Text>
                    </View>
                    <Text style={styles.reviewPanelBody}>
                        You have reviewed the field-level classification above. Encrypted fields (red) contain your
                        commercial secrets and will <Text style={{ fontWeight: '800' }}>never</Text> appear in the
                        Digital Product Passport. Public fields (green) will form the passport.
                    </Text>
                    <View style={styles.reviewSummaryRow}>
                        <View style={[styles.reviewSummaryChip, { backgroundColor: '#F0FFF4' }]}>
                            <Ionicons name="eye-outline" size={13} color={COLORS.green} />
                            <Text style={[styles.reviewSummaryChipText, { color: COLORS.green }]}>
                                {publicFields.length} fields → Passport
                            </Text>
                        </View>
                        <View style={[styles.reviewSummaryChip, { backgroundColor: '#FFF0F0' }]}>
                            <Ionicons name="lock-closed" size={13} color={COLORS.red} />
                            <Text style={[styles.reviewSummaryChipText, { color: COLORS.red }]}>
                                {confidentialFields.length} fields → AES-256 vault
                            </Text>
                        </View>
                    </View>
                    <Text style={styles.reviewPanelNote}>
                        Tapping "Approve" triggers POST /{dppId.substring(0, 8)}…/generate-passport (Step B). The server
                        applies a Where(!IsConfidential) filter and seals the result with SHA-256.
                    </Text>
                </View>
            )}

            {/* Actions — DPP: Approve & Generate Passport | QIR: View Fields | Invoice: Done */}
            {!isInvoice && !isQir ? (
                <TouchableOpacity
                    style={[styles.primaryBtn, { backgroundColor: COLORS.purple }, generating && styles.disabled]}
                    onPress={handleGeneratePassport}
                    disabled={generating}
                >
                    {generating ? (
                        <>
                            <ActivityIndicator color="white" />
                            <Text style={styles.primaryBtnText}>Generating Passport...</Text>
                        </>
                    ) : (
                        <>
                            <Ionicons name="checkmark-circle" size={22} color="white" />
                            <Text style={styles.primaryBtnText}>Approve &amp; Generate Passport</Text>
                        </>
                    )}
                </TouchableOpacity>
            ) : isQir ? (
                <TouchableOpacity
                    style={[styles.primaryBtn, { backgroundColor: '#2E7D32' }]}
                    onPress={() => navigation.navigate('QirExtractedFields', { transactionId: dppId })}
                >
                    <Ionicons name="analytics" size={22} color="white" />
                    <Text style={styles.primaryBtnText}>View QIR Fields</Text>
                </TouchableOpacity>
            ) : (
                <TouchableOpacity
                    style={[styles.primaryBtn, { backgroundColor: COLORS.green }]}
                    onPress={handleInvoiceDone}
                >
                    <Ionicons name="checkmark-circle" size={22} color="white" />
                    <Text style={styles.primaryBtnText}>
                        {documentEncrypted ? 'Encrypted & Saved — Done' : 'Invoice Secured — Done'}
                    </Text>
                </TouchableOpacity>
            )}

            <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => (isInvoice || isQir) ? navigation.goBack() : navigation.navigate('DocumentUpload')}
            >
                <Ionicons name={(isInvoice || isQir) ? 'arrow-back-outline' : 'add-circle-outline'} size={20} color={COLORS.primary} />
                <Text style={styles.secondaryBtnText}>
                    {(isInvoice || isQir) ? 'Back to Dashboard' : 'Process Another Document'}
                </Text>
            </TouchableOpacity>
        </ScrollView>
        </>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    inner: { paddingBottom: 40 },
    fallback: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
    fallbackText: { fontSize: 16, color: COLORS.sub },
    header: {
        paddingTop: 60, paddingBottom: 32, paddingHorizontal: 24,
        alignItems: 'center', borderBottomLeftRadius: 32, borderBottomRightRadius: 32,
        marginBottom: 20,
    },
    headerIconRing: {
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: 'rgba(255,255,255,0.25)',
        justifyContent: 'center', alignItems: 'center', marginBottom: 14,
    },
    statusTitle: { color: 'white', fontSize: 22, fontWeight: '800', letterSpacing: 1.5 },
    statusSubtitle: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 6 },
    card: {
        backgroundColor: COLORS.white, borderRadius: 16,
        padding: 18, marginHorizontal: 16, marginBottom: 14,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    },
    cardLabel: {
        fontSize: 11, color: '#8E8E93', fontWeight: '700',
        textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10,
    },
    actionRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    actionText: { fontSize: 17, fontWeight: '700' },
    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    confidenceValue: { fontWeight: '700', fontSize: 14 },
    progressBg: { height: 8, backgroundColor: '#E5E5EA', borderRadius: 4, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 4 },
    explanationText: { fontSize: 15, color: '#333', lineHeight: 22 },
    keywordRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
    keyword: { borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
    keywordText: { fontSize: 12, fontWeight: '700' },
    fieldGroup: { marginBottom: 10 },
    fieldGroupHeader: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginBottom: 8,
    },
    fieldGroupTitle: { fontSize: 12, fontWeight: '700' },
    fieldRow: {
        flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6,
        borderBottomWidth: 1, borderBottomColor: COLORS.border,
    },
    fieldName: { flex: 1, fontSize: 14, color: COLORS.text, fontWeight: '500' },
    fieldTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    fieldTagText: { fontSize: 11, fontWeight: '700' },
    idCard: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        marginHorizontal: 16, marginBottom: 20,
        backgroundColor: '#EEF0FF', padding: 14, borderRadius: 12,
    },
    idLabel: { color: COLORS.purple, fontWeight: '700', fontSize: 13 },
    idValue: { flex: 1, fontSize: 11, color: COLORS.sub, fontFamily: 'monospace' },
    primaryBtn: {
        marginHorizontal: 16, marginBottom: 12,
        padding: 18, borderRadius: 16,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
        shadowColor: COLORS.purple, shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
    },
    primaryBtnText: { color: 'white', fontSize: 16, fontWeight: '800' },
    disabled: { opacity: 0.7 },
    secondaryBtn: {
        marginHorizontal: 16,
        padding: 14, borderRadius: 14,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        borderWidth: 1.5, borderColor: COLORS.primary, backgroundColor: COLORS.white,
    },
    secondaryBtnText: { color: COLORS.primary, fontSize: 15, fontWeight: '700' },
    // ── Pipeline progress bar ──
    pipelineBar: {
        flexDirection: 'row', alignItems: 'center',
        marginHorizontal: 16, marginBottom: 4, marginTop: 16,
    },
    pipelineStep: { alignItems: 'center', flex: 1 },
    pipelineConnector: { height: 2, width: 32, backgroundColor: COLORS.green, marginHorizontal: 4, marginBottom: 20 },
    stepDot: {
        width: 30, height: 30, borderRadius: 15,
        justifyContent: 'center', alignItems: 'center', marginBottom: 4,
    },
    stepDone: { backgroundColor: COLORS.green },
    stepPending: { backgroundColor: COLORS.purple },
    stepDotTextPending: { color: 'white', fontSize: 13, fontWeight: '800' },
    stepLabelDone: { fontSize: 12, fontWeight: '800', color: COLORS.green },
    stepSubDone: { fontSize: 10, color: COLORS.green, opacity: 0.8 },
    stepLabelPending: { fontSize: 12, fontWeight: '800', color: COLORS.purple },
    stepSubPending: { fontSize: 10, color: COLORS.purple, opacity: 0.8 },
    // ── Glass Box Review Panel ──
    reviewPanel: {
        marginHorizontal: 16, marginBottom: 16,
        backgroundColor: '#EEF0FF',
        borderRadius: 16, padding: 18,
        borderWidth: 1.5, borderColor: COLORS.purple,
    },
    reviewPanelHeader: {
        flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10,
    },
    reviewPanelTitle: { fontSize: 14, fontWeight: '800', color: COLORS.purple },
    reviewPanelBody: { fontSize: 13, color: '#3A3A4A', lineHeight: 20, marginBottom: 12 },
    reviewSummaryRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
    reviewSummaryChip: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    },
    reviewSummaryChipText: { fontSize: 12, fontWeight: '700' },
    reviewPanelNote: {
        fontSize: 11, color: '#5856A0', lineHeight: 16,
        backgroundColor: 'rgba(88,86,210,0.08)',
        padding: 10, borderRadius: 8, fontFamily: 'monospace',
    },
    // ── Gemini extraction card ──
    sectionHeaderRow: {
        flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12,
    },
    statRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
    statBox: {
        flex: 1, borderRadius: 10, padding: 10, alignItems: 'center',
    },
    statNum: { fontSize: 22, fontWeight: '800' },
    statLbl: { fontSize: 10, color: COLORS.sub, fontWeight: '600', marginTop: 2 },
    extractedRow: {
        flexDirection: 'row', alignItems: 'flex-start',
        paddingVertical: 9, gap: 8,
    },
    extractedRowBorder: {
        borderBottomWidth: 1, borderBottomColor: COLORS.border,
    },
    extractedLeft: { flex: 1 },
    extractedFieldName: {
        fontSize: 13, fontWeight: '700', color: COLORS.text, marginBottom: 3,
    },
    extractedValue: {
        fontSize: 12, color: COLORS.sub, lineHeight: 16,
    },
    encryptedBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: '#FFE5E5', paddingHorizontal: 8, paddingVertical: 3,
        borderRadius: 6, alignSelf: 'flex-start',
    },
    encryptedBadgeText: { fontSize: 10, color: COLORS.red, fontWeight: '700' },
    fieldConfBadge: {
        paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, minWidth: 40, alignItems: 'center',
    },
    fieldConfBadgeText: { fontSize: 11, fontWeight: '800' },
    // ── Supported formats card ──
    formatsCard: {},
    formatsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
    formatChip: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        borderWidth: 1.5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16,
    },
    formatChipText: { fontSize: 11, fontWeight: '700' },
    // ── Field breakdown extras ──
    fieldExtractedVal: {
        fontSize: 11, color: COLORS.sub, marginTop: 2, lineHeight: 16,
    },
    // ── Encrypted Document Saved Banner ──
    encryptedSavedBanner: {
        marginHorizontal: 16, marginBottom: 16, marginTop: 4,
        backgroundColor: '#1A1A2E',
        borderRadius: 16, padding: 16,
        borderWidth: 1.5, borderColor: '#E53935',
    },
    encryptedSavedIconRow: {
        flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8,
    },
    encryptedSavedTitle: {
        fontSize: 14, fontWeight: '800', color: '#fff', flex: 1,
    },
    encryptedSavedBody: {
        fontSize: 12, color: '#CCCCDD', lineHeight: 18, marginBottom: 10,
    },
    encryptedSavedRow: {
        flexDirection: 'row', gap: 8, flexWrap: 'wrap',
    },
    encryptedSavedChip: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        backgroundColor: '#FFE5E5', paddingHorizontal: 10, paddingVertical: 5,
        borderRadius: 20,
    },
    encryptedSavedChipText: {
        fontSize: 11, fontWeight: '700', color: COLORS.red,
    },
});

// ── Side-by-Side Comparison Table styles ───────────────────────────────────
const sbTable = StyleSheet.create({
    headerRow: {
        flexDirection: 'row',
        borderBottomWidth: 1.5,
        borderBottomColor: COLORS.border,
        paddingBottom: 6,
        marginBottom: 2,
    },
    hd: {
        fontSize: 9,
        fontWeight: '800',
        color: '#8E8E93',
        textTransform: 'uppercase',
        letterSpacing: 0.6,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: 8,
        paddingHorizontal: 4,
        borderRadius: 6,
    },
    rowBorder: {
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    // Column widths
    col1: { flex: 3, paddingRight: 6 },
    col2: { flex: 4, paddingRight: 6 },
    col3: { flex: 3, alignItems: 'center' },
    // Cell content
    fieldTxt: { fontSize: 12, fontWeight: '700', color: COLORS.text, lineHeight: 16 },
    valTxt:   { fontSize: 12, color: '#3A3A4A', lineHeight: 16 },
    confTxt:  { fontSize: 9,  color: COLORS.sub, marginTop: 3, fontWeight: '600' },
    hiddenBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 3,
        backgroundColor: '#FFE5E5', paddingHorizontal: 6, paddingVertical: 3,
        borderRadius: 5, alignSelf: 'flex-start',
    },
    hiddenTxt: { fontSize: 10, color: COLORS.red, fontWeight: '700' },
    outcomeBadge: {
        borderWidth: 1, borderRadius: 7,
        paddingHorizontal: 7, paddingVertical: 5,
        alignItems: 'center', gap: 3,
    },
    outcomeTxt: { fontSize: 10, fontWeight: '800', textAlign: 'center', lineHeight: 14 },
});

// ── Encryption Modal styles ────────────────────────────────────────────────
const modal = StyleSheet.create({
    overlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
        paddingHorizontal: 20, paddingBottom: 36, paddingTop: 8,
        maxHeight: '92%',
    },
    header: {
        alignItems: 'center', paddingVertical: 20,
        borderBottomWidth: 1, borderBottomColor: '#E5E5EA', marginBottom: 16,
    },
    iconRing: {
        width: 64, height: 64, borderRadius: 32,
        backgroundColor: '#E53935',
        justifyContent: 'center', alignItems: 'center', marginBottom: 10,
    },
    title: { fontSize: 20, fontWeight: '800', color: '#1C1C1E', marginBottom: 4 },
    subtitle: { fontSize: 13, color: '#636366' },
    section: { marginBottom: 14 },
    sectionLabel: {
        fontSize: 10, fontWeight: '800', color: '#8E8E93',
        textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10,
    },
    infoRow: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8,
    },
    infoText: { flex: 1, fontSize: 13, color: '#3A3A4A', lineHeight: 18 },
    infoBold: { fontWeight: '700', color: '#1C1C1E' },
    statsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
    statChip: {
        flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: '#FFE5E5', paddingHorizontal: 10, paddingVertical: 7,
        borderRadius: 12,
    },
    statChipText: { fontSize: 11, fontWeight: '700' },
    idRow: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: '#EEF0FF', padding: 10, borderRadius: 10, marginBottom: 12,
    },
    idLabel: { fontSize: 12, fontWeight: '700', color: COLORS.purple },
    idValue: { flex: 1, fontSize: 11, color: COLORS.sub, fontFamily: 'monospace' },
    detailsBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        borderWidth: 1.5, borderColor: COLORS.purple, borderRadius: 12,
        paddingVertical: 10, marginBottom: 14,
    },
    detailsBtnText: { color: COLORS.purple, fontSize: 14, fontWeight: '700' },
    fileInfoBox: {
        backgroundColor: '#F8F8FF', borderRadius: 12,
        padding: 12, marginBottom: 14,
        borderWidth: 1, borderColor: '#C7C5E8',
    },
    fileInfoHeader: { fontSize: 12, fontWeight: '800', color: COLORS.purple, marginBottom: 8 },
    fileInfoRow: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
        paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#E5E5EA', gap: 8,
    },
    fileInfoKey: { fontSize: 11, fontWeight: '700', color: '#8E8E93', width: 88 },
    fileInfoVal: { flex: 1, fontSize: 11, color: '#1C1C1E', lineHeight: 16, textAlign: 'right' },
    doneBtn: {
        backgroundColor: COLORS.green, borderRadius: 14,
        paddingVertical: 14, flexDirection: 'row',
        alignItems: 'center', justifyContent: 'center', gap: 8,
    },
    doneBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
