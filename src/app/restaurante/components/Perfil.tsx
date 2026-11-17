'use client';

import { useState, useEffect } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/services/firebase";
import styles from "../restaurante.module.css";
import { FaStore, FaRegFileAlt, FaMapMarkerAlt } from "react-icons/fa";

interface PerfilProps {
    dadosLoja: any;
}

export default function Perfil({ dadosLoja }: PerfilProps) {
    const [loading, setLoading] = useState(false);
    
    const [formLoja, setFormLoja] = useState({
        nome: "",
        cnpj: "",
        categoria: "",
        endereco: ""
    });

    useEffect(() => {
        if (dadosLoja) {
            setFormLoja({
                nome: dadosLoja.nome || "",
                cnpj: dadosLoja.cnpj || "",
                categoria: dadosLoja.categoria || "Pizza",
                endereco: dadosLoja.endereco || "Av. Paulista, 900 (Unidade Cadastrada)"
            });
        }
    }, [dadosLoja]);

    const alterarCampo = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormLoja(prev => ({ ...prev, [name]: value }));
    };

    // 📤 Atualiza os dados comerciais diretamente no documento da loja no Firestore
    const salvarAlteracoesComerciais = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!dadosLoja?.id) {
            alert("Erro: ID identificador do restaurante não encontrado na sessão. ❌");
            return;
        }

        setLoading(true);
        try {
            const lojaRef = doc(db, "restaurantes", dadosLoja.id);
            
            // O updateDoc atualiza apenas esses 4 campos, mantendo o usuarioId e os produtos intactos!
            await updateDoc(lojaRef, {
                nome: formLoja.nome,
                cnpj: formLoja.cnpj,
                categoria: formLoja.categoria,
                endereco: formLoja.endereco
            });
            
            alert("Dados comerciais do estabelecimento atualizados com sucesso na nuvem! 🏪✨");
            
            window.location.reload();
        } catch (error) {
            console.error("Erro ao atualizar o perfil comercial no Firestore:", error);
            alert("Erro ao conectar com o servidor na nuvem ao tentar salvar.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.informacoesRestaurante}>
            <h1>Configurações do Estabelecimento</h1>

            <form className={styles.formRestaurante} onSubmit={salvarAlteracoesComerciais}>
                
                {/* CAMPO 1: NOME FANTASIA */}
                <div className={styles.campo}>
                    <label htmlFor="nome">Nome Fantasia do Restaurante</label>
                    <div className={styles.inputIcon}>
                        <FaStore />
                        <input 
                            type="text" 
                            id="nome" 
                            name="nome" 
                            value={formLoja.nome} 
                            onChange={alterarCampo} 
                            placeholder="Ex: Burguer Sênior Unidade Central"
                            required 
                        />
                    </div>
                </div>

                {/* CAMPO 2: CNPJ DA EMPRESA */}
                <div className={styles.campo}>
                    <label htmlFor="cnpj">CNPJ Oficial</label>
                    <div className={styles.inputIcon}>
                        <FaRegFileAlt />
                        <input 
                            type="text" 
                            id="cnpj" 
                            name="cnpj" 
                            value={formLoja.cnpj} 
                            onChange={alterarCampo} 
                            placeholder="00.000.000/0001-00"
                            required 
                        />
                    </div>
                </div>

                {/* LINHA DUPLA: CATEGORIA E ENDEREÇO */}
                <div className={styles.linhaCampos}>
                    <div className={styles.campo}>
                        <label htmlFor="categoria">Segmento / Categoria de Cozinha</label>
                        <select 
                            id="categoria" 
                            name="categoria" 
                            value={formLoja.categoria} 
                            onChange={alterarCampo}
                            style={{ width: "100%", height: "42px", padding: "0 16px", border: "1px solid #dfe3e8", borderRadius: "14px", backgroundColor: "#fff", color: "#10213b", fontSize: "13px", outline: "none" }}
                        >
                            <option value="Pizza">Pizza 🍕</option>
                            <option value="Hambúrguer">Hambúrguer 🍔</option>
                            <option value="Japonesa">Japonesa 🍣</option>
                            <option value="Bebidas">Bebidas & Refrescos 🥤</option>
                            <option value="Sobremesas">Doces & Sobremesas 🍰</option>
                            <option value="Salgados">Salgados & Lanches 🥐</option>
                        </select>
                    </div>

                    <div className={styles.campo}>
                        <label htmlFor="endereco">Endereço Comercial de Entrega</label>
                        <div className={styles.inputIcon}>
                            <FaMapMarkerAlt />
                            <input 
                                type="text" 
                                id="endereco" 
                                name="endereco" 
                                value={formLoja.endereco} 
                                onChange={alterarCampo} 
                                placeholder="Av. Paulista, 900"
                                required 
                            />
                        </div>
                    </div>
                </div>

                {/* BOTÃO SALVAR */}
                <button type="submit" className={styles.btnSalvar} disabled={loading}>
                    {loading ? "Sincronizando..." : "Salvar Alterações do Perfil 💾"}
                </button>

            </form>
        </div>
    );
}
