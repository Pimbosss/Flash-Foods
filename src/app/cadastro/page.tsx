'use client';
import './cadastro.css'
import Link from "next/link";
import useCadastro from './hooks/useCadastro';

export default function Cadastro() {
    const { router, updatedField, save, user } = useCadastro();

    return (
        <div className="cadastro-page">
            <div className="cadastro-box">
                <button
                    className="fechar"
                    onClick={() => router.push("/", { scroll: false })}
                >
                    ✕
                </button>

                <h1>Cadastrar</h1>
                <p>Faça parte do Flash Foods</p>

                {/* Adicionado o evento onSubmit no formulário que chama a função save */}
                <form onSubmit={save}>
                    <label htmlFor="email">Email</label>
                    <input
                        type="email"
                        id="email"
                        name="email" 
                        value={user.email}
                        onChange={updatedField}
                        placeholder="Digite seu email"
                    />
                    <label htmlFor="nome">Nome Completo</label>
                    <input
                        type="name"
                        id="name"
                        name="name" 
                        value={user.name}
                        onChange={updatedField}
                        placeholder="Digite seu Nomel"
                    />

                    <label htmlFor="cpf">CPF</label>
                    <input
                        type="text" 
                        id="cpf"
                        name="cpf"
                        value={user.cpf}
                        onChange={updatedField}
                        placeholder="Digite seu CPF"
                    />

                    <label htmlFor="phone">Telefone</label>
                    <input
                        type="tel" 
                        id="phone"
                        name="phone"
                        value={user.phone}
                        onChange={updatedField}
                        placeholder="Digite seu Telefone"
                    />

                    <label htmlFor="endereco">Endereço</label>
                    <input
                        type="endereco" 
                        id="endereco"
                        name="endereco"
                        value={user.endereco || ""}
                        onChange={updatedField}
                        placeholder="Rua, Numero e Bairro"
                    />

                    <label htmlFor="password">Senha</label>
                    <input
                        type="password"
                        id="password"
                        name="password"
                        value={user.password}
                        onChange={updatedField}
                        placeholder="Crie uma senha"
                    />
                    <span style={{ color: '#9ca3af', fontSize: '11px', marginTop: '-12px', marginBottom: '16px', textAlign: 'left' }}>
                        Mínimo de 6 caracteres
                    </span>

                    <label htmlFor="confirmPassword">Confirmar a Senha</label>
                    <input
                        type="password"
                        id="confirmPassword"
                        name="confirmPassword"
                        value={user.confirmPassword}
                        onChange={updatedField}
                        placeholder="Digite a senha novamente"
                    />
                    <button type="submit">
                        Criar Conta
                    </button>
                </form>

                <p className="cadastro">
                    Já tem uma conta?{" "}
                    <Link href="/login">
                        Login
                    </Link>
                </p>
            </div>
        </div>
    );
}