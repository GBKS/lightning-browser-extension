import {
  EllipsisIcon,
  PlusIcon,
  WalletIcon,
} from "@bitcoin-design/bitcoin-icons-react/filled";
import { CrossIcon } from "@bitcoin-design/bitcoin-icons-react/outline";
import Button from "@components/Button";
import Container from "@components/Container";
import Loading from "@components/Loading";
import Menu from "@components/Menu";
import TextField from "@components/form/TextField";
import type { FormEvent } from "react";
import { useState } from "react";
import Modal from "react-modal";
import QRCode from "react-qr-code";
import { useNavigate } from "react-router-dom";
import { useAccounts } from "~/app/context/AccountsContext";
import { useAuth } from "~/app/context/AuthContext";
import api from "~/common/lib/api";
import utils from "~/common/lib/utils";
import type { Account } from "~/types";

type AccountAction = Omit<Account, "connector" | "config">;

function AccountsScreen() {
  const auth = useAuth();
  const { accounts, getAccounts } = useAccounts();
  const navigate = useNavigate();

  const [currentAccountId, setCurrentAccountId] = useState("");
  const [editModalIsOpen, setEditModalIsOpen] = useState(false);
  const [exportModalIsOpen, setExportModalIsOpen] = useState(false);
  const [newAccountName, setNewAccountName] = useState("");
  const [lndHubData, setLndHubData] = useState({
    login: "",
    password: "",
    url: "",
    lnAddress: "",
  });
  const [loading, setLoading] = useState(false);

  function closeEditModal() {
    setEditModalIsOpen(false);
  }

  function closeExportModal() {
    setExportModalIsOpen(false);
  }

  async function selectAccount(accountId: string) {
    auth.setAccountId(accountId);
    await api.selectAccount(accountId);
    auth.fetchAccountInfo({ accountId });
  }

  async function updateAccountName({ id, name }: AccountAction) {
    await utils.call("editAccount", {
      name,
      id,
    });

    getAccounts();
    closeEditModal();
  }

  async function exportAccount({ id, name }: AccountAction) {
    setLoading(true);
    /**
     * @HACK
     * @headless-ui/menu restores focus after closing a menu, to the button that opened it.
     * By slightly delaying opening the modal, react-modal's focus management won't be overruled.
     * {@link https://github.com/tailwindlabs/headlessui/issues/259}
     */
    setTimeout(() => {
      setExportModalIsOpen(true);
    }, 50);
    setLndHubData(
      await utils.call("accountDecryptedDetails", {
        name,
        id,
      })
    );
    setLoading(false);
  }

  async function removeAccount({ id, name }: AccountAction) {
    if (
      window.confirm(
        `Are you sure you want to remove account: ${name}? \nThis can not be undone. If you used this account to login to websites you might loose access to those.`
      )
    ) {
      let nextAccountId;
      let accountIds = Object.keys(accounts);
      if (auth.account?.id === id && accountIds.length > 1) {
        nextAccountId = accountIds.filter((accountId) => accountId !== id)[0];
      }

      await api.removeAccount(id);
      accountIds = accountIds.filter((accountId) => accountId !== id);

      if (accountIds.length > 0) {
        getAccounts();
        if (nextAccountId) selectAccount(nextAccountId);
      } else {
        window.close();
      }
    }
  }

  return (
    <Container>
      <h2 className="mt-12 mb-6 text-2xl font-bold dark:text-white">
        Accounts
      </h2>
      <div className="shadow border-b border-gray-200 dark:border-neutral-500 sm:rounded-lg bg-white dark:bg-surface-02dp">
        <div className="p-6">
          <Button
            icon={<PlusIcon className="w-5 h-5 mr-2" />}
            label="Add account"
            primary
            onClick={() => navigate(`/accounts/new`)}
          />
        </div>
        <table className="min-w-full">
          <tbody className="divide-y divide-gray-200">
            {Object.keys(accounts).map((accountId) => {
              const account = accounts[accountId];
              return (
                <tr key={accountId}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-12 h-12 flex justify-center items-center rounded-full bg-orange-bitcoin-50">
                        <WalletIcon className="w-8 h-8 text-black" />
                      </div>
                      <div className="ml-4">
                        <h3 className="font-bold text-gray-900 dark:text-white">
                          {account.name}
                        </h3>
                        <p className="text-gray-700 dark:text-neutral-400">
                          {account.connector}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Menu as="div" className="relative">
                      <Menu.Button className="ml-auto flex items-center text-gray-700 hover:text-black transition-color duration-200 dark:hover:text-white">
                        <EllipsisIcon className="h-6 w-6 rotate-90" />
                      </Menu.Button>

                      <Menu.List position="right">
                        <Menu.ItemButton
                          onClick={() => {
                            setCurrentAccountId(accountId);
                            setNewAccountName(account.name);
                            /**
                             * @HACK
                             * @headless-ui/menu restores focus after closing a menu, to the button that opened it.
                             * By slightly delaying opening the modal, react-modal's focus management won't be overruled.
                             * {@link https://github.com/tailwindlabs/headlessui/issues/259}
                             */
                            setTimeout(() => {
                              setEditModalIsOpen(true);
                            }, 50);
                          }}
                        >
                          Edit
                        </Menu.ItemButton>

                        {account.connector === "lndhub" && (
                          <Menu.ItemButton
                            onClick={() =>
                              exportAccount({
                                id: accountId,
                                name: account.name,
                              })
                            }
                          >
                            Export
                          </Menu.ItemButton>
                        )}

                        <Menu.ItemButton
                          danger
                          onClick={() =>
                            removeAccount({
                              id: accountId,
                              name: account.name,
                            })
                          }
                        >
                          Remove
                        </Menu.ItemButton>
                      </Menu.List>
                    </Menu>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <Modal
          closeTimeoutMS={200}
          isOpen={editModalIsOpen}
          onRequestClose={closeEditModal}
          contentLabel="Edit account name"
          overlayClassName="bg-black bg-opacity-25 fixed inset-0 flex justify-center items-center p-5"
          className="rounded-lg bg-white w-full max-w-lg"
        >
          <div className="p-5 flex justify-between dark:bg-surface-02dp">
            <h2 className="text-2xl font-bold dark:text-white">Edit account</h2>
            <button onClick={closeEditModal}>
              <CrossIcon className="w-6 h-6 dark:text-white" />
            </button>
          </div>

          <form
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              updateAccountName({
                id: currentAccountId,
                name: newAccountName,
              });
            }}
          >
            <div className="p-5 border-t border-b border-gray-200 dark:bg-surface-02dp dark:border-neutral-500">
              <div className="w-60">
                <TextField
                  autoFocus
                  id="accountName"
                  label="Name"
                  onChange={(e) => setNewAccountName(e.target.value)}
                  value={newAccountName}
                />
              </div>
            </div>

            <div className="flex justify-end p-5 dark:bg-surface-02dp">
              <Button
                label="Save"
                type="submit"
                primary
                disabled={newAccountName === ""}
              />
            </div>
          </form>
        </Modal>

        <Modal
          closeTimeoutMS={200}
          isOpen={exportModalIsOpen}
          onRequestClose={closeExportModal}
          contentLabel="Edit account name"
          overlayClassName="bg-black bg-opacity-25 fixed inset-0 flex justify-center items-center p-5"
          className="rounded-lg bg-white w-full max-w-lg"
        >
          <div className="p-5 flex justify-between dark:bg-surface-02dp">
            <h2 className="text-2xl font-bold dark:text-white">
              Export account
            </h2>
            <button onClick={closeExportModal}>
              <CrossIcon className="w-6 h-6 dark:text-white" />
            </button>
          </div>

          {loading && (
            <div className="p-5 flex justify-center items-center space-x-2 dark:text-white">
              <Loading />
              <span>waiting for LndHub data...</span>
            </div>
          )}
          {!loading && (
            <div className="p-5 border-t border-b border-gray-200 dark:bg-surface-02dp dark:border-neutral-500">
              {lndHubData.lnAddress && (
                <div className="dark:text-white mb-6">
                  <p>
                    <strong>Your Lightning Address:</strong>
                  </p>
                  {lndHubData.lnAddress && <p>{lndHubData.lnAddress}</p>}
                </div>
              )}
              <div className="flex justify-center space-x-3 items-center dark:text-white">
                <div className="flex-1">
                  <p>
                    <strong>
                      Tip: Use this wallet with your mobile device
                    </strong>
                  </p>
                  <p>
                    Import this wallet into Zeus or BlueWallet by scanning the
                    QRCode.
                  </p>
                </div>
                <div className="float-right">
                  <QRCode
                    value={`lndhub://${lndHubData.login}:${lndHubData.password}@${lndHubData.url}/`}
                    level="M"
                    size={130}
                  />
                </div>
              </div>
              <div className="mt-6">
                <TextField
                  id="uri"
                  label="LNDHub Export URI"
                  type="text"
                  readOnly
                  value={`lndhub://${lndHubData.login}:${lndHubData.password}@${lndHubData.url}/`}
                />
              </div>
            </div>
          )}
        </Modal>
      </div>
    </Container>
  );
}

export default AccountsScreen;
