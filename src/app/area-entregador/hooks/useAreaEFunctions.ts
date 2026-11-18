'use client';

import { useEffect, useState } from "react";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "@/services/firebase";

export interface PedidoReal {
    id: string;
    usuarioId: string;
    usuarioNome: string;
    itens: Array<{
        id: string;
        nome: string;
        quantidade: number;
        precoUnitario: number;
    }>;
    subtotal: number;
    taxaEntrega: number;
    total: number;
    status: "pendente" | "preparando" | "a caminho" | "concluido";
    data: string;
    restaurante?: string;
    restauranteId?: string;
    endereco?: string;
    enderecoRestaurante?: string;
    distancia?: string;
    tempo?: string;
    valor?: string;
}

export default function useAreaEFunctions() {
    const [online, setOnline] = useState<boolean>(() => {
        if (typeof window !== "undefined") {
            const statusSalvo = localStorage.getItem("flashfoods:online");
            return statusSalvo === null ? true : statusSalvo === "true";
        }
        return true;
    });

    const [pedidosBanco, setPedidosBanco] = useState<PedidoReal[]>([]);
    const [entregaAtual, setEntregaAtual] = useState<PedidoReal | null>(null);
    const [gpsVisivel, setGpsVisivel] = useState(true);
    const [ganhosHoje, setGanhosHoje] = useState(0);
    const [entregasTotais, setEntregasTotais] = useState(0);
    const [ganhosOntem, setGanhosOntem] = useState(0);
    const [tempoTotal, setTempoTotal] = useState(0);
    const [inicioOnline, setInicioOnline] = useState(Date.now());

    const diferencaOntem = ganhosHoje - ganhosOntem;

    // 📥 Busca os pedidos e cruza com os endereços reais dos restaurantes no Firestore
    const carregarCorridasDisponiveis = async () => {
        try {
            const [pedidosSnap, restaurantesSnap] = await Promise.all([
                getDocs(collection(db, "pedidos")),
                getDocs(collection(db, "restaurantes"))
            ]);

            // Cria um mapa rápido { idDaLoja: dadosDaLoja } para achar o endereço real
            const mapaRestaurantes: Record<string, any> = {};
            restaurantesSnap.docs.forEach(docLoja => {
                mapaRestaurantes[docLoja.id] = docLoja.data();
            });

            const listaGeral = pedidosSnap.docs.map(documento => ({
                id: documento.id,
                ...documento.data()
            }));

            const pedidosAdaptados = listaGeral.map((p: any) => {
                const kmCalculado = p.distancia
                    ? Number(p.distancia.replace(" km", "").replace(",", "."))
                    : Number((Math.random() * 4.3 + 1.2).toFixed(1));

                const ganhoCorrida = 6.00 + (kmCalculado * 3.00);
                const valorDinamic = `R$ ${ganhoCorrida.toFixed(2).replace(".", ",")}`;

                // Busca a loja real pelo restauranteId do pedido
                const lojaReal = p.restauranteId ? mapaRestaurantes[p.restauranteId] : null;

                return {
                    ...p,
                    status: p.status,
                    restaurante: lojaReal?.nome || p.restaurante || "Flash Foods Store",
                    endereco: p.endereco || "Endereço do cliente não informado",
                    enderecoRestaurante: lojaReal?.endereco || p.enderecoRestaurante || "Endereço da loja não informado",
                    distancia: p.distancia || `${kmCalculado.toFixed(1).replace(".", ",")} km`,
                    tempo: p.tempo || `${Math.floor(kmCalculado * 5)} min`,
                    valor: p.valor || valorDinamic
                };
            });

            const corridasFiltradas = pedidosAdaptados.filter((p: any) =>
                p.status === "preparando" || p.status === "a caminho"
            );

            setPedidosBanco(corridasFiltradas);
        } catch (err) {
            console.error("Erro ao puxar pedidos do Firestore:", err);
        }
    };

    useEffect(() => {
        if (typeof window !== "undefined") {
            const sessao = localStorage.getItem("flashfoods:user");

            if (!sessao) {
                alert("Acesso negado! Por favor, faça login para acessar o painel do entregador. 🔐");
                window.location.href = "/login";
                return;
            }

            const usuarioLogado = JSON.parse(sessao);
            if (usuarioLogado.tipo !== "entregador") {
                alert("⚠️ Acesso Negado! Esta área é exclusiva para entregadores parceiros cadastrados.");
                window.location.href = "/";
            }
        }
    }, [])

    useEffect(() => {
        carregarCorridasDisponiveis();
    }, [entregaAtual]);

    useEffect(() => {
        if (!online) return;
        const intervalo = setInterval(() => {
            setTempoTotal(Date.now() - inicioOnline);
        }, 1000);
        return () => clearInterval(intervalo);
    }, [online, inicioOnline]);

    function resetarTudo() {
        setGanhosHoje(0);
        setEntregasTotais(0);
        setGanhosOntem(0);
        setTempoTotal(0);
    }

    function alterarStatus() {
        if (online) {
            setOnline(false);
            localStorage.setItem("flashfoods:online", "false");
        } else {
            setOnline(true);
            localStorage.setItem("flashfoods:online", "true");
            setInicioOnline(Date.now() - tempoTotal);
        }
    }

    function formatarTempo(tempo: number) {
        const segundosTotais = Math.floor(tempo / 1000);
        const horas = Math.floor(segundosTotais / 3600);
        const minutos = Math.floor((segundosTotais % 3600) / 60);
        const segundos = segundosTotais % 60;
        return `${String(horas).padStart(2, "0")}:${String(minutos).padStart(2, "0")}:${String(segundos).padStart(2, "0")}`;
    }

    // 🟢 Atualiza o status para "a caminho" diretamente no documento do Firestore
    async function aceitarEntrega(entrega: PedidoReal) {
        if (!online || entregaAtual) return;

        try {
            const pedidoRef = doc(db, "pedidos", entrega.id);
            await updateDoc(pedidoRef, {
                status: "a caminho",
                valor: entrega.valor,
                distancia: entrega.distancia,
                tempo: entrega.tempo
            });

            const pacoteAtualizado = {
                ...entrega,
                status: "a caminho" as const
            };

            setEntregaAtual(pacoteAtualizado);
            setGpsVisivel(true);
            alert("Corrida aceita com sucesso! Dirija-se ao estabelecimento para coletar o lanche. 🏍️💨");
        } catch (err) {
            console.error("Erro ao aceitar corrida no Firestore:", err);
            alert("Erro ao aceitar corrida no servidor.");
        }
    }

    // 🟢 Conclui a entrega no Firestore e soma o ganho na carteira do dia
    async function finalizarEntrega() {
        if (!entregaAtual) return;

        try {
            const pedidoRef = doc(db, "pedidos", entregaAtual.id);
            await updateDoc(pedidoRef, {
                status: "concluido"
            });

            const valorEntrega = Number(
                (entregaAtual.valor || "R$ 15,50")
                    .replace("R$", "")
                    .replace(".", "")
                    .replace(",", ".")
                    .trim()
            );

            setGanhosHoje(prev => prev + valorEntrega);
            setEntregasTotais(prev => prev + 1);
            setEntregaAtual(null);
            setGpsVisivel(false);
            alert("Entrega concluída com sucesso! Dinheiro na conta. 🎉💰");
        } catch (err) {
            console.error("Erro ao finalizar entrega no Firestore:", err);
            alert("Erro ao finalizar entrega no servidor.");
        }
    }

    return {
        online,
        entregaAtual,
        gpsVisivel,
        ganhosHoje,
        entregasTotais,
        ganhosOntem,
        diferencaOntem,
        tempoTotal,
        inicioOnline,
        entregas: pedidosBanco,
        setOnline,
        setGpsVisivel,
        alterarStatus,
        formatarTempo,
        aceitarEntrega,
        resetarTudo,
        finalizarEntrega
    };
}
